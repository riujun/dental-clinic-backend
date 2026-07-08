// DONE: Paso 4 - service de Pacientes (Módulo 1): CRUD, buscador, anamnesis versionada,
//       alertas médicas y alerta de revisión >24 meses (HU-P1/P2/P3)
// TODO: pendiente módulo Auth - recibir userId real en create/update/anamnesis (createdBy)
// TODO: pendiente Fase 2 - normalizar teléfonos sin prefijo internacional usando el
//       país del tenant (hoy solo se normalizan los que empiezan con '+')
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Model, QueryFilter } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { MedicalHistoryDto } from './dto/medical-history.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Patient, PatientDocument } from './schemas/patient.schema';

/** Meses desde la última revisión médica a partir de los cuales se alerta (estándar ADA) */
const ANAMNESIS_MAX_AGE_MONTHS = 24;

export interface PatientProfile {
  patient: PatientDocument;
  /** Alertas rojas prominentes del perfil 360° (HU-P2, patrón Open Dental) */
  medicalAlerts: {
    allergies: string[];
    requiresPremedication: boolean;
    bisphosphonates: boolean;
    isPregnant: boolean;
  };
  /** true si la anamnesis nunca se revisó o tiene más de 24 meses (HU-P3) */
  anamnesisOutdated: boolean;
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreatePatientDto, userId?: string): Promise<PatientDocument> {
    if (dto.documentNumber) {
      const dup = await this.patientModel
        .findOne({ tenantId, documentNumber: dto.documentNumber })
        .exec();
      if (dup) {
        throw new ConflictException(
          `Ya existe un paciente con documento ${dto.documentNumber} en esta clínica`,
        );
      }
    }

    const created = await this.patientModel.create({
      ...dto,
      phone: this.normalizePhone(dto.phone),
      tenantId,
      createdBy: userId,
    });
    this.audit.log({
      tenantId,
      action: 'patient.created',
      entityType: Patient.name,
      entityId: created.id as string,
      userId,
      after: { firstName: created.firstName, lastName: created.lastName, documentNumber: created.documentNumber },
    });
    return created;
  }

  async findAll(tenantId: string, q: QueryPatientsDto): Promise<PatientDocument[]> {
    const filter: QueryFilter<Patient> = { tenantId };
    filter.status = q.status ?? { $ne: 'archived' }; // archivados solo si se piden explícitamente
    if (q.search) {
      // Regex case-insensitive e INSENSIBLE A TILDES ("garcia" → "García"):
      // soporta prefijos, que $text no cubre. Migrar a Atlas Search si escala.
      const escaped = q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const accentMap: Record<string, string> = {
        a: '[aáà]', e: '[eéè]', i: '[iíì]', o: '[oóò]', u: '[uúüù]', n: '[nñ]',
      };
      const rx = new RegExp(
        escaped.replace(/[aeioun]/gi, (c) => accentMap[c.toLowerCase()]),
        'i',
      );
      filter.$or = [{ firstName: rx }, { lastName: rx }, { documentNumber: rx }];
    }
    return this.patientModel.find(filter).sort({ lastName: 1, firstName: 1 }).exec();
  }

  /** Perfil 360° (HU-P2): paciente + alertas rojas + estado de la anamnesis */
  async findOne(tenantId: string, id: string): Promise<PatientProfile> {
    const patient = await this.patientModel.findOne({ tenantId, _id: id }).exec();
    if (!patient) throw new NotFoundException(`Paciente ${id} no encontrado`);

    const mh = patient.medicalHistory;
    return {
      patient,
      medicalAlerts: {
        allergies: (mh?.allergies ?? []).map((a) => a.substance),
        requiresPremedication: mh?.requiresPremedication ?? false,
        bisphosphonates: mh?.bisphosphonates ?? false,
        isPregnant: mh?.isPregnant ?? false,
      },
      anamnesisOutdated: this.isAnamnesisOutdated(mh?.lastMedicalReview),
    };
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePatientDto,
    userId?: string,
  ): Promise<PatientDocument> {
    if (dto.documentNumber) {
      const dup = await this.patientModel
        .findOne({ tenantId, documentNumber: dto.documentNumber, _id: { $ne: id } })
        .exec();
      if (dup) {
        throw new ConflictException(
          `Ya existe otro paciente con documento ${dto.documentNumber} en esta clínica`,
        );
      }
    }
    const updated = await this.patientModel
      .findOneAndUpdate(
        { tenantId, _id: id },
        { $set: { ...dto, ...(dto.phone !== undefined ? { phone: this.normalizePhone(dto.phone) } : {}) } },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Paciente ${id} no encontrado`);

    this.audit.log({
      tenantId,
      action: 'patient.updated',
      entityType: Patient.name,
      entityId: id,
      userId,
      after: dto as Record<string, unknown>,
    });
    return updated;
  }

  /**
   * HU-P3: actualiza la anamnesis versionando el cambio — el estado anterior queda
   * en el audit log con fecha y usuario. Merge parcial: solo pisa los campos enviados.
   */
  async updateAnamnesis(
    tenantId: string,
    id: string,
    dto: MedicalHistoryDto,
    userId?: string,
  ): Promise<PatientProfile> {
    const patient = await this.patientModel.findOne({ tenantId, _id: id }).exec();
    if (!patient) throw new NotFoundException(`Paciente ${id} no encontrado`);

    const before = patient.medicalHistory ? { ...patient.medicalHistory } : undefined;
    patient.medicalHistory = {
      ...patient.medicalHistory,
      ...dto,
      lastMedicalReview: dto.lastMedicalReview ?? new Date(),
    };
    patient.markModified('medicalHistory');
    await patient.save();

    this.audit.log({
      tenantId,
      action: 'patient.anamnesis_updated',
      entityType: Patient.name,
      entityId: id,
      userId,
      before,
      after: patient.medicalHistory as Record<string, unknown>,
    });
    return this.findOne(tenantId, id);
  }

  /** Borrado lógico: los datos de salud no se eliminan físicamente (auditoría) */
  async archive(tenantId: string, id: string, userId?: string): Promise<PatientDocument> {
    const archived = await this.patientModel
      .findOneAndUpdate({ tenantId, _id: id }, { $set: { status: 'archived' } }, { new: true })
      .exec();
    if (!archived) throw new NotFoundException(`Paciente ${id} no encontrado`);
    this.audit.log({
      tenantId,
      action: 'patient.archived',
      entityType: Patient.name,
      entityId: id,
      userId,
    });
    return archived;
  }

  private isAnamnesisOutdated(lastReview?: Date): boolean {
    if (!lastReview) return true;
    const limit = new Date();
    limit.setMonth(limit.getMonth() - ANAMNESIS_MAX_AGE_MONTHS);
    return lastReview < limit;
  }

  /** Normaliza a E.164 (spec Módulo 1) — necesario para WhatsApp/SMS de fase 2 */
  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return phone;
    const parsed = parsePhoneNumberFromString(phone);
    if (parsed?.isValid()) return parsed.number; // E.164
    if (phone.startsWith('+')) {
      throw new BadRequestException(`Teléfono inválido: ${phone}`);
    }
    return phone; // sin prefijo internacional: se guarda tal cual (TODO país del tenant)
  }
}
