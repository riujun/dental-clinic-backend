// DONE: Paso 7 - service de Profesionales (Módulo 4): CRUD + filtro por especialidad
//       + resolución del % de comisión (usado por Procedures al completar)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import {
  CreateProfessionalDto,
  QueryProfessionalsDto,
  UpdateProfessionalDto,
} from './dto/professional.dtos';
import { Professional, ProfessionalDocument } from './schemas/professional.schema';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectModel(Professional.name)
    private readonly profModel: Model<Professional>,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateProfessionalDto): Promise<ProfessionalDocument> {
    return this.profModel.create({ ...dto, tenantId });
  }

  /** HU-E2: con ?specialty= devuelve solo doctores capacitados y activos */
  async findAll(tenantId: string, q: QueryProfessionalsDto): Promise<ProfessionalDocument[]> {
    const filter: QueryFilter<Professional> = { tenantId };
    if (!q.includeInactive) filter.active = true;
    if (q.specialty) filter.specialties = q.specialty;
    return this.profModel.find(filter).sort({ fullName: 1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<ProfessionalDocument> {
    const doc = await this.profModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Profesional ${id} no encontrado`);
    return doc;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProfessionalDto,
    userId?: string,
  ): Promise<ProfessionalDocument> {
    const doc = await this.findOne(tenantId, id);
    const before = {
      commissionRate: doc.commissionRate,
      commissionOverrides: doc.commissionOverrides,
    };
    Object.assign(doc, dto);
    await doc.save();

    // Cambio de % de comisión = sensible → audit (no afecta snapshots pasados, HU-C1)
    if (dto.commissionRate !== undefined || dto.commissionOverrides !== undefined) {
      this.audit.log({
        tenantId,
        action: 'professional.commission_updated',
        entityType: Professional.name,
        entityId: id,
        userId,
        before: before as unknown as Record<string, unknown>,
        after: {
          commissionRate: doc.commissionRate,
          commissionOverrides: doc.commissionOverrides,
        } as unknown as Record<string, unknown>,
      });
    }
    return doc;
  }

  /**
   * Resuelve el % aplicable a un procedimiento (Módulo 6): override por categoría
   * si existe, si no el rate global. Se llama AL COMPLETAR — el resultado se guarda
   * como snapshot en ProcedureInstance (cambios futuros no alteran lo liquidado).
   */
  resolveCommissionRate(professional: Professional, category?: string): number {
    if (category) {
      const override = professional.commissionOverrides?.find(
        (o) => o.category.toLowerCase() === category.toLowerCase(),
      );
      if (override) return override.rate;
    }
    return professional.commissionRate;
  }
}
