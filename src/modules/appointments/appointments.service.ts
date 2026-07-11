// DONE: Paso 10b - service de Agenda: solapamiento por doctor, advertencia de
//       especialidad (HU-E2), transiciones de estado, reagendado
// TODO: pendiente Fase 2 - recordatorios automáticos (BullMQ + email/WhatsApp),
//       lista de espera para llenar cancelaciones, validación contra workingHours
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import {
  ChangeAppointmentStatusDto,
  CreateAppointmentDto,
  QueryAppointmentsDto,
  UpdateAppointmentDto,
} from './dto/appointment.dtos';
import {
  Appointment,
  AppointmentDocument,
  APPOINTMENT_TRANSITIONS,
  BLOCKING_STATUSES,
} from './schemas/appointment.schema';

export interface AppointmentResult {
  appointment: AppointmentDocument;
  /** HU-E2: true si el doctor no tiene la especialidad requerida (se permite con aviso) */
  specialtyWarning: boolean;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly apptModel: Model<Appointment>,
    private readonly professionals: ProfessionalsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateAppointmentDto,
    userId?: string,
  ): Promise<AppointmentResult> {
    this.validateRange(dto.startAt, dto.endAt);
    const professional = await this.professionals.findOne(tenantId, dto.professionalId);
    await this.assertNoOverlap(tenantId, dto.professionalId, dto.startAt, dto.endAt);

    // HU-E2: si nadie/este doctor no tiene la especialidad, se permite CON advertencia
    const specialtyWarning =
      !!dto.requiredSpecialty &&
      !professional.specialties.includes(dto.requiredSpecialty);

    const appointment = await this.apptModel.create({
      ...dto,
      tenantId,
      patientId: new Types.ObjectId(dto.patientId),
      professionalId: new Types.ObjectId(dto.professionalId),
      treatmentPlanId: dto.treatmentPlanId ? new Types.ObjectId(dto.treatmentPlanId) : undefined,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    this.audit.log({
      tenantId,
      action: 'appointment.created',
      entityType: Appointment.name,
      entityId: appointment.id as string,
      userId,
      after: {
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        startAt: dto.startAt,
        specialtyWarning,
      },
    });
    return { appointment, specialtyWarning };
  }

  async findAll(tenantId: string, q: QueryAppointmentsDto): Promise<AppointmentDocument[]> {
    const filter: QueryFilter<Appointment> = { tenantId };
    if (q.professionalId) filter.professionalId = new Types.ObjectId(q.professionalId);
    if (q.patientId) filter.patientId = new Types.ObjectId(q.patientId);
    if (q.status) filter.status = q.status;
    if (q.from || q.to) {
      filter.startAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      };
    }
    return this.apptModel.find(filter).sort({ startAt: 1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<AppointmentDocument> {
    const doc = await this.apptModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Cita ${id} no encontrada`);
    return doc;
  }

  /** Reagendar/editar: solo citas que aún ocupan agenda (scheduled/confirmed) */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateAppointmentDto,
    userId?: string,
  ): Promise<AppointmentDocument> {
    const appt = await this.findOne(tenantId, id);
    if (!BLOCKING_STATUSES.includes(appt.status)) {
      throw new ConflictException(`Una cita '${appt.status}' no se puede modificar`);
    }

    const startAt = dto.startAt ?? appt.startAt;
    const endAt = dto.endAt ?? appt.endAt;
    const professionalId = dto.professionalId ?? String(appt.professionalId);
    this.validateRange(startAt, endAt);

    const rescheduled =
      dto.startAt !== undefined || dto.endAt !== undefined || dto.professionalId !== undefined;
    if (rescheduled) {
      await this.professionals.findOne(tenantId, professionalId);
      await this.assertNoOverlap(tenantId, professionalId, startAt, endAt, id);
    }

    const before = { startAt: appt.startAt, professionalId: String(appt.professionalId) };
    appt.startAt = startAt;
    appt.endAt = endAt;
    appt.professionalId = new Types.ObjectId(professionalId);
    if (dto.reason !== undefined) appt.reason = dto.reason;
    if (dto.notes !== undefined) appt.notes = dto.notes;
    await appt.save();

    if (rescheduled) {
      this.audit.log({
        tenantId,
        action: 'appointment.rescheduled',
        entityType: Appointment.name,
        entityId: id,
        userId,
        before,
        after: { startAt, professionalId },
      });
    }
    return appt;
  }

  async changeStatus(
    tenantId: string,
    id: string,
    dto: ChangeAppointmentStatusDto,
    userId?: string,
  ): Promise<AppointmentDocument> {
    const appt = await this.findOne(tenantId, id);
    const allowed = APPOINTMENT_TRANSITIONS[appt.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Transición inválida: ${appt.status} → ${dto.status}. Permitidas: ${allowed.join(', ') || 'ninguna'}`,
      );
    }

    const before = appt.status;
    appt.status = dto.status;
    if (dto.status === 'cancelled') {
      appt.cancelledAt = new Date();
      appt.cancelReason = dto.reason;
      // Idea #8: el front consulta GET /waitlist/matches tras cancelar, para
      // sugerir a quién ofrecerle este horario liberado.
    }
    await appt.save();

    this.audit.log({
      tenantId,
      action: 'appointment.status_changed',
      entityType: Appointment.name,
      entityId: id,
      userId,
      before: { status: before },
      after: { status: dto.status, reason: dto.reason },
    });
    return appt;
  }

  /** Etapa A comunicaciones: registra que recepción envió el recordatorio (wa.me) */
  async reminderSent(tenantId: string, id: string, userId?: string): Promise<AppointmentDocument> {
    const appt = await this.findOne(tenantId, id);
    appt.lastReminderAt = new Date();
    await appt.save();
    this.audit.log({
      tenantId,
      action: 'appointment.reminder_sent',
      entityType: Appointment.name,
      entityId: id,
      userId,
      after: { lastReminderAt: appt.lastReminderAt },
    });
    return appt;
  }

  private validateRange(startAt: Date, endAt: Date): void {
    if (endAt <= startAt) {
      throw new BadRequestException('endAt debe ser posterior a startAt');
    }
  }

  /** Un doctor no puede tener dos citas activas solapadas */
  private async assertNoOverlap(
    tenantId: string,
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<void> {
    const clash = await this.apptModel
      .findOne({
        tenantId,
        professionalId: new Types.ObjectId(professionalId),
        status: { $in: BLOCKING_STATUSES },
        startAt: { $lt: endAt },
        endAt: { $gt: startAt },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .exec();
    if (clash) {
      throw new ConflictException(
        `El doctor ya tiene una cita de ${clash.startAt.toISOString()} a ${clash.endAt.toISOString()}`,
      );
    }
  }
}
