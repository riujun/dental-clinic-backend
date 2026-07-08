// DONE: Paso 7 - schema Professional (Módulo 4): especialidades + config de comisión
// El rol de sistema (RBAC 'doctor') es independiente de las especialidades clínicas:
// la especialidad filtra agendamiento y sugiere qué procedimientos realiza.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ProfessionalDocument = HydratedDocument<Professional>;

/** 12 especialidades reconocidas por la ADA (constante compartida back/front) */
export const SPECIALTIES = [
  'general',
  'orthodontics',
  'endodontics',
  'periodontics',
  'pediatric_dentistry',
  'prosthodontics',
  'oral_maxillofacial_surgery',
  'oral_pathology',
  'oral_radiology',
  'dental_anesthesiology',
  'dental_public_health',
  'implantology',
] as const;

@Schema({ timestamps: true })
export class Professional {
  @Prop({ index: true, required: true }) tenantId: string;

  /** Vínculo al usuario de sistema (módulo Auth, pendiente) */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true }) fullName: string;
  @Prop() licenseNumber?: string;                 // matrícula

  @Prop({ type: [String], default: ['general'] })
  specialties: string[];

  @Prop() color?: string;                         // color en la agenda
  @Prop({ default: true }) active: boolean;

  // --- Config comisión (Módulo 6) ---
  /** 0.50 = 50% por defecto, ajustable por doctor (HU-C1) */
  @Prop({ type: Number, default: 0.5 }) commissionRate: number;

  /** % distinto por categoría de procedimiento (ej. Restauración 40%) */
  @Prop({ type: [{ category: String, rate: Number, _id: false }], default: [] })
  commissionOverrides: { category: string; rate: number }[];

  // --- Agenda ---
  @Prop({ type: Object })
  workingHours?: Record<string, { from: string; to: string }[]>;
}

export const ProfessionalSchema = SchemaFactory.createForClass(Professional);
ProfessionalSchema.index({ tenantId: 1, active: 1, specialties: 1 }); // filtro HU-E2
