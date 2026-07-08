// DONE: Paso 5 - schema FeeSchedule (Módulo 3): una lista de precios por tenant
// Tipos según Open Dental: UCR/lista general, por convenio/seguro, copago, override
// por proveedor. El tipo 'insurance' deja la puerta abierta a seguros/claims (Fase 3).
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type FeeScheduleDocument = HydratedDocument<FeeSchedule>;

export const FEE_SCHEDULE_TYPES = [
  'standard',
  'insurance',
  'copay',
  'provider_override',
] as const;

@Schema({ timestamps: true, collection: 'fee_schedules' })
export class FeeSchedule {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ required: true }) name: string; // "Lista general", "Convenio X"

  @Prop({ type: String, enum: FEE_SCHEDULE_TYPES, default: 'standard' })
  type: (typeof FEE_SCHEDULE_TYPES)[number];

  /** Solo una lista default por tenant (HU-A2) — el service lo garantiza */
  @Prop({ default: false }) isDefault: boolean;

  /** Para type='provider_override': a qué doctor aplica */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional' })
  providerId?: Types.ObjectId;
}

export const FeeScheduleSchema = SchemaFactory.createForClass(FeeSchedule);
FeeScheduleSchema.index({ tenantId: 1, name: 1 }, { unique: true });
