// DONE: Paso 9 - schema Payment (Módulo 8.1, crítico MVP): abonos del paciente
// aplicables a procedimientos. Los pagos NUNCA se borran: se anulan (voided) con
// motivo y audit — son datos contables.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'check', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['active', 'voided'] as const;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Patient', index: true, required: true })
  patientId: Types.ObjectId;

  @Prop({ required: true }) amount: number;

  @Prop({ type: String, enum: PAYMENT_METHODS, required: true })
  method: PaymentMethod;

  /** Fecha del cobro — clave de la caja diaria (Day Sheet) */
  @Prop({ index: true, required: true }) paidAt: Date;

  /** Aplicación del abono a procedimientos concretos (estado de cuenta) */
  @Prop({
    type: [{ procedureId: { type: MongooseSchema.Types.ObjectId, ref: 'ProcedureInstance' }, amount: Number, _id: false }],
    default: [],
  })
  applications: { procedureId: Types.ObjectId; amount: number }[];

  @Prop() notes?: string;

  @Prop({ type: String, enum: PAYMENT_STATUSES, default: 'active', index: true })
  status: (typeof PAYMENT_STATUSES)[number];

  @Prop() voidedAt?: Date;
  @Prop() voidReason?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' }) createdBy?: Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
// Caja diaria: pagos del día por tenant
PaymentSchema.index({ tenantId: 1, paidAt: 1, status: 1 });
