// DONE: Paso 3 - schema ProcedureInstance (Módulo 5 de la spec)
// ENTIDAD CENTRAL DE PRODUCCIÓN: presupuestos, comisiones, reportes y estado de
// cuenta se calculan sobre esta única fuente de verdad (patrón Open Dental).
// value / commissionRate / commissionAmount son SNAPSHOTS inmutables (Key Finding 2 y 3).
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ProcedureInstanceDocument = HydratedDocument<ProcedureInstance>;

export const PROCEDURE_STATUSES = ['planned', 'completed', 'cancelled'] as const;
export type ProcedureStatus = (typeof PROCEDURE_STATUSES)[number];

@Schema({ timestamps: true, collection: 'procedure_instances' })
export class ProcedureInstance {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Patient', index: true, required: true })
  patientId: Types.ObjectId;

  /** Presente cuando el procedimiento nace de un presupuesto (Módulo 2) */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'TreatmentPlan' })
  treatmentPlanId?: Types.ObjectId;

  @Prop({ required: true }) code: string;
  @Prop({ required: true }) description: string;
  @Prop() toothFdi?: string;              // "11".."48", o rango
  @Prop([String]) surfaces?: string[];    // ['M','O','D','V','L']

  /** SNAPSHOT del valor cobrado — nunca se recalcula desde el arancel */
  @Prop({ required: true }) value: number;

  @Prop({ enum: PROCEDURE_STATUSES, default: 'planned', index: true })
  status: ProcedureStatus;

  /** Fecha de realización — clave para reportes de producción y liquidaciones */
  @Prop({ index: true }) completedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional', index: true })
  performedByProviderId?: Types.ObjectId;

  /** Usuario que marcó el completado (auditoría — Módulo 8.3) */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  completedBy?: Types.ObjectId;

  @Prop() category?: string;              // para comisión por categoría (Módulo 6)

  // --- Comisión calculada (snapshot al completar, Módulos 5/6) ---
  @Prop() commissionRate?: number;        // % aplicado (snapshot del Professional)
  @Prop() commissionAmount?: number;      // value * commissionRate

  /** HU-C3: los reembolsos son ProcedureInstance de VALOR NEGATIVO vinculados al
   *  original — descuentan producción y comisión del periodo en que se emiten */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProcedureInstance' })
  refundOf?: Types.ObjectId;

  /** Historial clínico (pedido de Fabián): qué le hizo el doctor al paciente.
   *  Se puede cargar al completar o editar después — libre, versión simple
   *  del "evoluciones SOAP" de la spec base (sin campos S/O/A/P separados). */
  @Prop() clinicalNote?: string;
  @Prop() clinicalNoteAt?: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  clinicalNoteBy?: Types.ObjectId;
}

export const ProcedureInstanceSchema = SchemaFactory.createForClass(ProcedureInstance);

// Índice de reportes de producción/liquidación (spec Módulo 5)
ProcedureInstanceSchema.index({ tenantId: 1, completedAt: 1, performedByProviderId: 1 });
