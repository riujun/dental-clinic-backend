// DONE: Paso 10b - schema Appointment (Agenda/Citas, spec base)
// Base de los recordatorios automáticos de Fase 2 (recall/recare + confirmaciones):
// startAt indexado permite al worker BullMQ encontrar "citas de mañana" barato.
// no_show se registra para los KPIs de Fase 2 y la lista de espera.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

export const APPOINTMENT_STATUSES = [
  'scheduled', // agendada
  'confirmed', // confirmada por el paciente
  'completed', // atendida
  'cancelled',
  'no_show',   // no se presentó
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Estados que OCUPAN el horario del doctor (chequeo de solapamiento) */
export const BLOCKING_STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed'];

/** Transiciones válidas */
export const APPOINTMENT_TRANSITIONS: Record<string, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'completed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Patient', index: true, required: true })
  patientId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional', index: true, required: true })
  professionalId: Types.ObjectId;

  @Prop({ required: true, index: true }) startAt: Date;
  @Prop({ required: true }) endAt: Date;

  @Prop() reason?: string;                 // motivo/tratamiento
  @Prop() notes?: string;

  /** Especialidad requerida por el tratamiento (filtra doctores, HU-E2) */
  @Prop() requiredSpecialty?: string;

  @Prop({ type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled', index: true })
  status: AppointmentStatus;

  @Prop() cancelledAt?: Date;
  @Prop() cancelReason?: string;

  /** Vínculo opcional al presupuesto que motiva la cita */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'TreatmentPlan' })
  treatmentPlanId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  /** Último recordatorio manual enviado (Etapa A wa.me — ver
   *  docs/comunicaciones-y-seguimiento.md). Fase 2: array + envío automático. */
  @Prop() lastReminderAt?: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
// Agenda del doctor por día + chequeo de solapamiento
AppointmentSchema.index({ tenantId: 1, professionalId: 1, startAt: 1 });
AppointmentSchema.index({ tenantId: 1, patientId: 1, startAt: 1 });
