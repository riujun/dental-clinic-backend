// DONE: Paso 8 - schema CommissionSettlement (Módulo 6): cierre de periodos por doctor
// La liquidación congela la lista de procedimientos incluidos; los snapshots de
// rate/monto viven en cada ProcedureInstance (cambiar el % del doctor no altera nada).
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type CommissionSettlementDocument = HydratedDocument<CommissionSettlement>;

export const SETTLEMENT_STATUSES = ['draft', 'closed', 'paid'] as const;

@Schema({ timestamps: true, collection: 'commission_settlements' })
export class CommissionSettlement {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional', index: true, required: true })
  providerId: Types.ObjectId;

  @Prop({ required: true }) periodFrom: Date;
  @Prop({ required: true }) periodTo: Date;

  @Prop({ default: 0 }) totalProduction: number;   // suma de values (refunds restan)
  @Prop({ default: 0 }) totalCommission: number;   // suma de commissionAmount

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  procedureIds: Types.ObjectId[];

  @Prop({ type: String, enum: SETTLEMENT_STATUSES, default: 'draft' })
  status: (typeof SETTLEMENT_STATUSES)[number];

  @Prop() closedAt?: Date;
  @Prop() paidAt?: Date;
}

export const CommissionSettlementSchema = SchemaFactory.createForClass(CommissionSettlement);
CommissionSettlementSchema.index({ tenantId: 1, providerId: 1, periodFrom: 1 });
