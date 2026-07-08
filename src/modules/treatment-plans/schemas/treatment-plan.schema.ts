// DONE: Paso 6 - schema TreatmentPlan + TreatmentPlanItem (Módulo 2 de la spec)
// unitPrice es SNAPSHOT inmutable del arancel al cotizar (HU-B4 / Key Finding 2).
// Nota de implementación: los ítems SÍ llevan _id (la spec los muestra _id:false)
// porque se necesita referenciarlos individualmente al completarlos; no cambia el
// modelo de datos, solo agrega identidad a cada subdocumento.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const PLAN_STATUSES = [
  'DRAFT',
  'PRESENTED',
  'ACCEPTED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const ITEM_STATUSES = ['planned', 'completed', 'cancelled'] as const;

/** Transiciones manuales permitidas (máquina de estados de la spec).
 *  IN_PROGRESS y COMPLETED se alcanzan AUTOMÁTICAMENTE al completar ítems. */
export const MANUAL_TRANSITIONS: Record<string, PlanStatus[]> = {
  DRAFT: ['PRESENTED', 'CANCELLED'],
  PRESENTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'],
  REJECTED: ['CANCELLED'],
  IN_PROGRESS: ['CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Schema()
export class TreatmentPlanItem {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FeeItem' })
  feeItemId?: Types.ObjectId;

  @Prop({ required: true }) code: string;         // snapshot código
  @Prop({ required: true }) description: string;  // snapshot nombre
  @Prop() category?: string;                      // snapshot (para comisión por categoría)
  @Prop() toothFdi?: string;                      // "11".."48", o rango
  @Prop([String]) surfaces?: string[];            // ['M','O','D','V','L']

  @Prop({ required: true }) unitPrice: number;    // SNAPSHOT del arancel al cotizar
  @Prop({ default: 1 }) quantity: number;
  @Prop({ default: 0 }) discount: number;         // monto absoluto (TODO Fase 2: soportar %)
  @Prop() subtotal: number;                       // unitPrice*quantity - discount (hook)
  @Prop({ default: 1 }) priority: number;         // agrupación/orden (patrón Open Dental)

  @Prop({ type: String, enum: ITEM_STATUSES, default: 'planned' })
  status: (typeof ITEM_STATUSES)[number];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional' })
  assignedProviderId?: Types.ObjectId;

  /** Se llena al completar: ref al ProcedureInstance creado (fuente de producción) */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProcedureInstance' })
  executedProcedureId?: Types.ObjectId;
}

const TreatmentPlanItemSchema = SchemaFactory.createForClass(TreatmentPlanItem);
// Subdocumento: el tenant vive en el plan padre — exento del plugin de tenancy
TreatmentPlanItemSchema.set('tenancy' as never, false as never);

export type TreatmentPlanDocument = HydratedDocument<TreatmentPlan>;

@Schema({ timestamps: true, collection: 'treatment_plans' })
export class TreatmentPlan {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Patient', index: true, required: true })
  patientId: Types.ObjectId;

  @Prop() title?: string;                         // "Plan A", "Rehabilitación superior"

  @Prop({ type: String, enum: PLAN_STATUSES, default: 'DRAFT', index: true })
  status: PlanStatus;

  /** Un solo plan activo por paciente (HU-B3) — el service lo garantiza */
  @Prop({ default: true }) isActive: boolean;

  @Prop({ type: [TreatmentPlanItemSchema], default: [] })
  items: TreatmentPlanItem[];

  @Prop() subtotal: number;
  @Prop() totalDiscount: number;
  @Prop() total: number;                          // recalculado en pre-save hook

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FeeSchedule' })
  feeScheduleId?: Types.ObjectId;

  @Prop() presentedAt?: Date;
  @Prop() acceptedAt?: Date;
  @Prop() signatureUrl?: string;                  // TODO: pendiente Fase 2 - firma en S3

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const TreatmentPlanSchema = SchemaFactory.createForClass(TreatmentPlan);
TreatmentPlanSchema.index({ tenantId: 1, patientId: 1, isActive: 1 });

// Hook de la spec: recalcula subtotales/total y sincroniza el status del plan según
// el estado de los ítems (ejecución parcial → IN_PROGRESS; todos completos → COMPLETED)
TreatmentPlanSchema.pre('save', function () {
  const plan = this as unknown as TreatmentPlan;

  const activeItems = plan.items.filter((i) => i.status !== 'cancelled');
  for (const item of plan.items) {
    item.subtotal =
      Math.round((item.unitPrice * item.quantity - item.discount) * 100) / 100;
  }
  plan.subtotal = round2(activeItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  plan.totalDiscount = round2(activeItems.reduce((s, i) => s + i.discount, 0));
  plan.total = round2(activeItems.reduce((s, i) => s + (i.subtotal ?? 0), 0));

  // Sincronización de estado (solo desde estados "en ejecución")
  if (['ACCEPTED', 'IN_PROGRESS'].includes(plan.status)) {
    const completed = activeItems.filter((i) => i.status === 'completed').length;
    if (activeItems.length > 0 && completed === activeItems.length) {
      plan.status = 'COMPLETED';
    } else if (completed > 0) {
      plan.status = 'IN_PROGRESS';
    }
  }
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
