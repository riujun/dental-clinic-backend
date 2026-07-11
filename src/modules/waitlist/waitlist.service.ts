// DONE: Idea #8 - service de Lista de espera conectada a cancelaciones
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import {
  ChangeWaitlistStatusDto,
  CreateWaitlistEntryDto,
  QueryWaitlistDto,
  QueryWaitlistMatchesDto,
  UpdateWaitlistEntryDto,
} from './dto/waitlist.dtos';
import {
  WaitlistEntry,
  WaitlistEntryDocument,
} from './schemas/waitlist-entry.schema';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel(WaitlistEntry.name)
    private readonly waitlistModel: Model<WaitlistEntry>,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateWaitlistEntryDto,
    userId?: string,
  ): Promise<WaitlistEntryDocument> {
    const created = await this.waitlistModel.create({
      ...dto,
      tenantId,
      patientId: new Types.ObjectId(dto.patientId),
      professionalId: dto.professionalId ? new Types.ObjectId(dto.professionalId) : undefined,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      status: 'waiting',
    });
    this.audit.log({
      tenantId,
      action: 'waitlist.created',
      entityType: WaitlistEntry.name,
      entityId: created.id as string,
      userId,
      after: { patientId: dto.patientId, professionalId: dto.professionalId, reason: dto.reason },
    });
    return created;
  }

  async findAll(tenantId: string, q: QueryWaitlistDto): Promise<WaitlistEntryDocument[]> {
    const filter: QueryFilter<WaitlistEntry> = { tenantId };
    filter.status = q.status ?? 'waiting';
    if (q.professionalId) filter.professionalId = new Types.ObjectId(q.professionalId);
    return this.waitlistModel.find(filter).sort({ createdAt: 1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<WaitlistEntryDocument> {
    const doc = await this.waitlistModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Registro de lista de espera ${id} no encontrado`);
    return doc;
  }

  /**
   * Idea #8 (núcleo): al cancelar una cita, ¿quién en la lista de espera
   * podría tomar ese horario? Match por doctor (o sin preferencia) y por
   * fecha dentro del rango preferido (o sin rango = cualquier día).
   */
  async findMatches(
    tenantId: string,
    q: QueryWaitlistMatchesDto,
  ): Promise<WaitlistEntryDocument[]> {
    const filter: QueryFilter<WaitlistEntry> = {
      tenantId,
      status: 'waiting',
      $or: [
        { professionalId: { $exists: false } },
        ...(q.professionalId ? [{ professionalId: new Types.ObjectId(q.professionalId) }] : []),
      ],
    };
    const entries = await this.waitlistModel.find(filter).sort({ createdAt: 1 }).exec();
    return entries.filter((e) => {
      if (e.preferredFrom && q.date < e.preferredFrom) return false;
      if (e.preferredTo && q.date > e.preferredTo) return false;
      return true;
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateWaitlistEntryDto,
  ): Promise<WaitlistEntryDocument> {
    const doc = await this.findOne(tenantId, id);
    if (dto.professionalId !== undefined) doc.professionalId = new Types.ObjectId(dto.professionalId);
    if (dto.reason !== undefined) doc.reason = dto.reason;
    if (dto.notes !== undefined) doc.notes = dto.notes;
    if (dto.preferredFrom !== undefined) doc.preferredFrom = dto.preferredFrom;
    if (dto.preferredTo !== undefined) doc.preferredTo = dto.preferredTo;
    await doc.save();
    return doc;
  }

  async changeStatus(
    tenantId: string,
    id: string,
    dto: ChangeWaitlistStatusDto,
    userId?: string,
  ): Promise<WaitlistEntryDocument> {
    const doc = await this.findOne(tenantId, id);
    if (doc.status === 'scheduled' || doc.status === 'cancelled') {
      throw new ConflictException(`Este registro ya está '${doc.status}'`);
    }
    const before = doc.status;
    doc.status = dto.status;
    if (dto.status === 'scheduled' && dto.appointmentId) {
      doc.resolvedAppointmentId = new Types.ObjectId(dto.appointmentId);
    }
    await doc.save();

    this.audit.log({
      tenantId,
      action: 'waitlist.status_changed',
      entityType: WaitlistEntry.name,
      entityId: id,
      userId,
      before: { status: before },
      after: { status: dto.status, appointmentId: dto.appointmentId },
    });
    return doc;
  }
}
