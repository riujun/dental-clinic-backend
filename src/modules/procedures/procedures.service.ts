// DONE: Paso 3 - service de ProcedureInstance: CRUD base + transición planned→completed
// DONE: Paso 6 - createCompleted() para ítems de presupuesto (sincronización la hace
//       TreatmentPlansService, dueño del plan)
// DONE: Paso 7 - snapshot de comisión al completar: override por categoría o rate
//       global del Professional (Módulos 4/5/6)
// DONE: Paso 8 - refunds como ProcedureInstance de valor negativo (HU-C3)
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CompleteProcedureDto } from './dto/complete-procedure.dto';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { QueryProceduresDto } from './dto/query-procedures.dto';
import { RefundProcedureDto } from './dto/refund-procedure.dto';
import {
  ProcedureInstance,
  ProcedureInstanceDocument,
} from './schemas/procedure-instance.schema';

@Injectable()
export class ProceduresService {
  constructor(
    @InjectModel(ProcedureInstance.name)
    private readonly procModel: Model<ProcedureInstance>,
    private readonly audit: AuditService,
    private readonly professionals: ProfessionalsService,
  ) {}

  /** Snapshot de comisión (Módulos 4/6): valida el doctor y resuelve su % aplicable */
  private async commissionSnapshot(
    tenantId: string,
    providerId: string,
    value: number,
    category?: string,
  ): Promise<{ commissionRate: number; commissionAmount: number }> {
    const professional = await this.professionals.findOne(tenantId, providerId);
    const commissionRate = this.professionals.resolveCommissionRate(professional, category);
    return {
      commissionRate,
      commissionAmount: Math.round(value * commissionRate * 100) / 100,
    };
  }

  async create(tenantId: string, dto: CreateProcedureDto): Promise<ProcedureInstanceDocument> {
    const created = await this.procModel.create({ ...dto, tenantId, status: 'planned' });
    this.audit.log({
      tenantId,
      action: 'procedure.created',
      entityType: ProcedureInstance.name,
      entityId: created.id as string,
      after: { code: created.code, value: created.value, patientId: dto.patientId },
    });
    return created;
  }

  async findAll(tenantId: string, q: QueryProceduresDto): Promise<ProcedureInstanceDocument[]> {
    const filter: QueryFilter<ProcedureInstance> = { tenantId };
    if (q.status) filter.status = q.status;
    if (q.patientId) filter.patientId = new Types.ObjectId(q.patientId);
    if (q.providerId) filter.performedByProviderId = new Types.ObjectId(q.providerId);
    if (q.from || q.to) {
      filter.completedAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      };
    }
    return this.procModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<ProcedureInstanceDocument> {
    const doc = await this.procModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Procedimiento ${id} no encontrado`);
    return doc;
  }

  /**
   * HU-C3: reembolso como ProcedureInstance de VALOR NEGATIVO vinculado al original.
   * Descuenta producción y comisión (al rate snapshoteado del original) en el
   * periodo en que se emite — las liquidaciones futuras lo restan automáticamente.
   */
  async refund(
    tenantId: string,
    id: string,
    dto: RefundProcedureDto,
    userId?: string,
  ): Promise<ProcedureInstanceDocument> {
    const original = await this.findOne(tenantId, id);
    if (original.status !== 'completed') {
      throw new ConflictException('Solo procedimientos completados pueden reembolsarse');
    }
    if (original.value <= 0) {
      throw new ConflictException('No se puede reembolsar un ajuste/reembolso');
    }

    // Reembolsos acumulados no pueden superar el valor original
    const previous = await this.procModel
      .find({ tenantId, refundOf: original._id })
      .exec();
    const alreadyRefunded = previous.reduce((s, r) => s + Math.abs(r.value), 0);
    const amount = dto.amount ?? original.value - alreadyRefunded;
    if (amount <= 0 || alreadyRefunded + amount > original.value) {
      throw new ConflictException(
        `Monto inválido: ya reembolsado ${alreadyRefunded} de ${original.value}`,
      );
    }

    const rate = original.commissionRate ?? 0;
    const refund = await this.procModel.create({
      tenantId,
      patientId: original.patientId,
      treatmentPlanId: original.treatmentPlanId,
      code: original.code,
      description: `REEMBOLSO: ${original.description}${dto.reason ? ` (${dto.reason})` : ''}`,
      toothFdi: original.toothFdi,
      surfaces: original.surfaces,
      value: -amount,
      category: original.category,
      status: 'completed',
      completedAt: new Date(),
      performedByProviderId: original.performedByProviderId,
      completedBy: userId ? new Types.ObjectId(userId) : undefined,
      commissionRate: rate,
      commissionAmount: -Math.round(amount * rate * 100) / 100,
      refundOf: original._id,
    });

    this.audit.log({
      tenantId,
      action: 'procedure.refunded',
      entityType: ProcedureInstance.name,
      entityId: id,
      userId,
      after: {
        refundId: refund.id as string,
        amount,
        reason: dto.reason,
        commissionAdjustment: refund.commissionAmount,
      },
    });
    return refund;
  }

  /**
   * Crea un ProcedureInstance YA COMPLETADO a partir de un ítem de presupuesto
   * (Módulo 2 → Módulo 5: "cuando un ítem se marca como realizado se crea un
   * ProcedureInstance"). Usado por TreatmentPlansService.
   */
  async createCompleted(
    tenantId: string,
    data: {
      patientId: Types.ObjectId;
      treatmentPlanId: Types.ObjectId;
      code: string;
      description: string;
      toothFdi?: string;
      surfaces?: string[];
      value: number;
      category?: string;
      performedByProviderId: string;
      completedAt?: Date;
    },
    completedByUserId?: string,
  ): Promise<ProcedureInstanceDocument> {
    const commission = await this.commissionSnapshot(
      tenantId,
      data.performedByProviderId,
      data.value,
      data.category,
    );
    const created = await this.procModel.create({
      ...data,
      ...commission,
      tenantId,
      status: 'completed',
      completedAt: data.completedAt ?? new Date(),
      performedByProviderId: new Types.ObjectId(data.performedByProviderId),
      completedBy: completedByUserId ? new Types.ObjectId(completedByUserId) : undefined,
    });
    this.audit.log({
      tenantId,
      action: 'procedure.completed',
      entityType: ProcedureInstance.name,
      entityId: created.id as string,
      userId: completedByUserId,
      after: {
        code: created.code,
        value: created.value,
        completedAt: created.completedAt,
        performedByProviderId: data.performedByProviderId,
        treatmentPlanId: String(data.treatmentPlanId),
      },
    });
    return created;
  }

  /**
   * "Set Complete" (spec Módulo 5): solo procedimientos 'planned' pueden completarse;
   * registra fecha, doctor, quién lo marcó, y deja el snapshot de valor/comisión.
   */
  async complete(
    tenantId: string,
    id: string,
    dto: CompleteProcedureDto,
    completedByUserId?: string,
  ): Promise<ProcedureInstanceDocument> {
    const doc = await this.findOne(tenantId, id);
    if (doc.status !== 'planned') {
      throw new ConflictException(
        `Solo procedimientos 'planned' se pueden completar (estado actual: '${doc.status}')`,
      );
    }

    const before = { status: doc.status, value: doc.value };

    doc.status = 'completed';
    doc.completedAt = dto.completedAt ?? new Date();
    doc.performedByProviderId = new Types.ObjectId(dto.performedByProviderId);
    if (dto.value !== undefined) doc.value = dto.value;
    if (completedByUserId) doc.completedBy = new Types.ObjectId(completedByUserId);

    // Snapshot de comisión (Módulo 5, paso 3 del endpoint de la spec)
    const commission = await this.commissionSnapshot(
      tenantId,
      dto.performedByProviderId,
      doc.value,
      doc.category,
    );
    doc.commissionRate = commission.commissionRate;
    doc.commissionAmount = commission.commissionAmount;

    await doc.save();

    // Auditoría obligatoria (Módulo 8.3): quién marcó qué como realizado
    this.audit.log({
      tenantId,
      action: 'procedure.completed',
      entityType: ProcedureInstance.name,
      entityId: doc.id as string,
      userId: completedByUserId,
      before,
      after: {
        status: doc.status,
        value: doc.value,
        completedAt: doc.completedAt,
        performedByProviderId: dto.performedByProviderId,
      },
    });

    return doc;
  }
}
