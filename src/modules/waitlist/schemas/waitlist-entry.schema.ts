// DONE: Idea #8 - schema de Lista de espera conectada a cancelaciones
// El paciente queda anotado con un rango de fechas en que podría venir (o sin
// rango = "cualquier día") y un doctor preferido (o sin doctor = "cualquier
// doctor"). Al cancelar una cita, se buscan matches por professionalId + fecha.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type WaitlistEntryDocument = HydratedDocument<WaitlistEntry>;

export const WAITLIST_STATUSES = ['waiting', 'contacted', 'scheduled', 'cancelled'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

@Schema({ timestamps: true, collection: 'waitlist_entries' })
export class WaitlistEntry {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Patient', index: true, required: true })
  patientId: Types.ObjectId;

  /** Sin doctor = cualquiera puede atenderlo */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional', index: true })
  professionalId?: Types.ObjectId;

  @Prop() reason?: string;
  @Prop() notes?: string;

  /** Rango en que el paciente podría venir; sin fechas = cualquier día */
  @Prop() preferredFrom?: Date;
  @Prop() preferredTo?: Date;

  @Prop({ type: String, enum: WAITLIST_STATUSES, default: 'waiting', index: true })
  status: WaitlistStatus;

  /** Cita creada a partir de este registro, cuando status pasa a 'scheduled' */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Appointment' })
  resolvedAppointmentId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const WaitlistEntrySchema = SchemaFactory.createForClass(WaitlistEntry);
WaitlistEntrySchema.index({ tenantId: 1, status: 1, preferredFrom: 1 });
