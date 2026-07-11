// DONE: Paso 6 - service de Presupuestos (Módulo 2): máquina de estados, snapshots de
//       precio, plan activo único, ejecución parcial de ítems → ProcedureInstance
// TODO: pendiente Paso 7 - snapshot de comisión al completar (Professional.commissionRate)
// TODO: pendiente frontend - PDF del presupuesto con desglose por prioridad (HU-B2)
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { FeeSchedulesService } from '../fee-schedules/fee-schedules.service';
import { ProceduresService } from '../procedures/procedures.service';
import {
  ChangePlanStatusDto,
  CompletePlanItemDto,
  CreatePlanItemDto,
  CreateTreatmentPlanDto,
  QueryPlansDto,
  UpdateTreatmentPlanDto,
} from './dto/treatment-plan.dtos';
import {
  MANUAL_TRANSITIONS,
  TreatmentPlan,
  TreatmentPlanDocument,
  TreatmentPlanItem,
} from './schemas/treatment-plan.schema';

@Injectable()
export class TreatmentPlansService {
  constructor(
    @InjectModel(TreatmentPlan.name)
    private readonly planModel: Model<TreatmentPlan>,
    private readonly fees: FeeSchedulesService,
    private readonly procedures: ProceduresService,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateTreatmentPlanDto,
    userId?: string,
  ): Promise<TreatmentPlanDocument> {
    // Lista de precios: la indicada o la default del tenant (HU-A2)
    let feeScheduleId = dto.feeScheduleId;
    if (!feeScheduleId) {
      const def = await this.fees.findDefaultSchedule(tenantId);
      feeScheduleId = def?.id as string | undefined;
    }

    const items = await Promise.all(
      (dto.items ?? []).map((i) => this.resolveItem(tenantId, i)),
    );

    // HU-B3: un solo plan activo por paciente
    await this.planModel.updateMany(
      { tenantId, patientId: new Types.ObjectId(dto.patientId), isActive: true },
      { $set: { isActive: false } },
    );

    const plan = new this.planModel({
      tenantId,
      patientId: new Types.ObjectId(dto.patientId),
      title: dto.title ?? 'Plan de tratamiento',
      feeScheduleId: feeScheduleId ? new Types.ObjectId(feeScheduleId) : undefined,
      items,
      isActive: true,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    await plan.save(); // hook recalcula totales

    this.audit.log({
      tenantId,
      action: 'plan.created',
      entityType: TreatmentPlan.name,
      entityId: plan.id as string,
      userId,
      after: { patientId: dto.patientId, total: plan.total, items: plan.items.length },
    });
    return plan;
  }

  async findAll(tenantId: string, q: QueryPlansDto): Promise<TreatmentPlanDocument[]> {
    const filter: QueryFilter<TreatmentPlan> = { tenantId };
    if (q.patientId) filter.patientId = new Types.ObjectId(q.patientId);
    if (q.status) filter.status = q.status as TreatmentPlan['status'];
    return this.planModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<TreatmentPlanDocument> {
    const plan = await this.planModel.findOne({ tenantId, _id: id }).exec();
    if (!plan) throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    return plan;
  }

  /** Solo en DRAFT: tras emitir, los snapshots son inmutables (HU-B4) */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateTreatmentPlanDto,
    userId?: string,
  ): Promise<TreatmentPlanDocument> {
    const plan = await this.findOne(tenantId, id);
    if (plan.status !== 'DRAFT') {
      throw new ConflictException(
        `Solo presupuestos DRAFT son editables (estado actual: ${plan.status}). ` +
          'Los precios emitidos son snapshots inmutables (HU-B4).',
      );
    }
    if (dto.title !== undefined) plan.title = dto.title;
    if (dto.feeScheduleId !== undefined) plan.feeScheduleId = new Types.ObjectId(dto.feeScheduleId);
    if (dto.items) {
      plan.items = (await Promise.all(
        dto.items.map((i) => this.resolveItem(tenantId, i)),
      )) as TreatmentPlanItem[];
    }
    await plan.save();

    this.audit.log({
      tenantId,
      action: 'plan.updated',
      entityType: TreatmentPlan.name,
      entityId: id,
      userId,
      after: { total: plan.total, items: plan.items.length },
    });
    return plan;
  }

  /** Transiciones manuales de la máquina de estados (HU-B2) */
  async changeStatus(
    tenantId: string,
    id: string,
    dto: ChangePlanStatusDto,
    userId?: string,
  ): Promise<TreatmentPlanDocument> {
    const plan = await this.findOne(tenantId, id);
    const allowed = MANUAL_TRANSITIONS[plan.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Transición inválida: ${plan.status} → ${dto.status}. Permitidas: ${allowed.join(', ') || 'ninguna'}`,
      );
    }

    const before = plan.status;
    plan.status = dto.status;
    if (dto.status === 'PRESENTED') plan.presentedAt = new Date();
    if (dto.status === 'ACCEPTED') plan.acceptedAt = new Date();
    await plan.save();

    this.audit.log({
      tenantId,
      action: 'plan.status_changed',
      entityType: TreatmentPlan.name,
      entityId: id,
      userId,
      before: { status: before },
      after: { status: dto.status },
    });
    return plan;
  }

  /** HU-B3: activar un plan alternativo desactiva el anterior */
  async activate(tenantId: string, id: string, userId?: string): Promise<TreatmentPlanDocument> {
    const plan = await this.findOne(tenantId, id);
    await this.planModel.updateMany(
      { tenantId, patientId: plan.patientId, isActive: true, _id: { $ne: plan._id } },
      { $set: { isActive: false } },
    );
    plan.isActive = true;
    await plan.save();
    this.audit.log({
      tenantId,
      action: 'plan.activated',
      entityType: TreatmentPlan.name,
      entityId: id,
      userId,
    });
    return plan;
  }

  /**
   * Núcleo de la integración Módulo 2 ↔ Módulo 5: marcar un ítem como realizado
   * crea el ProcedureInstance (fuente única de producción), guarda su _id en el
   * ítem y el hook avanza el plan a IN_PROGRESS/COMPLETED automáticamente.
   */
  async completeItem(
    tenantId: string,
    planId: string,
    itemId: string,
    dto: CompletePlanItemDto,
    userId?: string,
  ): Promise<TreatmentPlanDocument> {
    const plan = await this.findOne(tenantId, planId);
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(plan.status)) {
      throw new ConflictException(
        `Solo planes ACCEPTED o IN_PROGRESS ejecutan ítems (estado actual: ${plan.status})`,
      );
    }
    const item = plan.items.find((i) => String(i._id) === itemId);
    if (!item) throw new NotFoundException(`Ítem ${itemId} no existe en este presupuesto`);
    if (item.status !== 'planned') {
      throw new ConflictException(`El ítem ya está '${item.status}'`);
    }

    const procedure = await this.procedures.createCompleted(
      tenantId,
      {
        patientId: plan.patientId,
        treatmentPlanId: plan._id as Types.ObjectId,
        code: item.code,
        description: item.description,
        toothFdi: item.toothFdi,
        surfaces: item.surfaces,
        value: dto.value ?? item.subtotal ?? item.unitPrice * item.quantity,
        category: item.category,
        performedByProviderId: dto.performedByProviderId,
        completedAt: dto.completedAt,
        clinicalNote: dto.clinicalNote,
      },
      userId,
    );

    item.status = 'completed';
    item.executedProcedureId = procedure._id as Types.ObjectId;
    await plan.save(); // hook sincroniza status del plan (IN_PROGRESS/COMPLETED)

    return plan;
  }

  /** Resuelve un ítem: snapshot desde el arancel (HU-B1) o carga manual completa */
  private async resolveItem(
    tenantId: string,
    dto: CreatePlanItemDto,
  ): Promise<Partial<TreatmentPlanItem>> {
    let base: Partial<TreatmentPlanItem> = {};
    if (dto.feeItemId) {
      const fee = await this.fees.findItem(tenantId, dto.feeItemId);
      base = {
        feeItemId: fee._id as Types.ObjectId,
        code: fee.code,
        description: fee.name,
        category: fee.category,
        unitPrice: fee.price, // SNAPSHOT — editable vía dto.unitPrice
      };
    }
    const code = dto.code ?? base.code;
    const description = dto.description ?? base.description;
    const unitPrice = dto.unitPrice ?? base.unitPrice;
    if (!code || !description || unitPrice === undefined) {
      throw new BadRequestException(
        'Cada ítem requiere feeItemId o (code + description + unitPrice) manuales',
      );
    }
    return {
      ...base,
      code,
      description,
      category: dto.category ?? base.category,
      toothFdi: dto.toothFdi,
      surfaces: dto.surfaces,
      unitPrice,
      quantity: dto.quantity ?? 1,
      discount: dto.discount ?? 0,
      priority: dto.priority ?? 1,
      assignedProviderId: dto.assignedProviderId
        ? new Types.ObjectId(dto.assignedProviderId)
        : undefined,
      status: 'planned',
    };
  }
}
