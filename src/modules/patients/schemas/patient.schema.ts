// DONE: Paso 4 - schema Patient con anamnesis estructurada estilo ADA (Módulo 1 de la spec)
// El versionado de la anamnesis (HU-P3) se registra en el audit log transversal
// (action 'patient.anamnesis_updated' con before/after, fecha y usuario) para no
// engordar el documento del paciente.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PatientDocument = HydratedDocument<Patient>;

export const PATIENT_STATUSES = ['active', 'inactive', 'archived'] as const;
export const SEX_VALUES = ['M', 'F', 'X', 'ND'] as const;
export const SMOKER_VALUES = ['no', 'current', 'former'] as const;

/** Idea #7: estado inicial del odontograma — condición de base del diente al
 *  ingreso del paciente (no confundir con procedimientos/tratamientos, que
 *  viven en ProcedureInstance). Editable por el doctor en cualquier momento. */
export const TOOTH_CONDITIONS = [
  'ausente',
  'cariado',
  'obturado',
  'corona',
  'implante',
  'endodoncia',
  'protesis_fija',
  'protesis_removible',
  'fracturado',
  'extraccion_indicada',
  'otro',
] as const;
export type ToothCondition = (typeof TOOTH_CONDITIONS)[number];

export interface ToothConditionEntry {
  toothFdi: string;
  condition: ToothCondition;
  notes?: string;
  updatedAt: Date;
  updatedBy?: Types.ObjectId;
}

/** Anamnesis médica (estándar ADA / patrón Open Dental) — crítica por interacciones
 *  con anestésicos, antibióticos, bifosfonatos, embarazo, alergias a látex. */
export interface MedicalHistory {
  allergies?: { substance: string; reaction?: string; severity?: string }[];
  medications?: { name: string; dose?: string; frequency?: string }[];
  conditions?: string[];              // hipertensión, diabetes, cardiopatía, etc.
  bisphosphonates?: boolean;          // riesgo osteonecrosis
  requiresPremedication?: boolean;    // prótesis articular, endocarditis
  isPregnant?: boolean;
  smoker?: (typeof SMOKER_VALUES)[number];
  lastMedicalReview?: Date;
  freeNotes?: string;
}

@Schema({ timestamps: true })
export class Patient {
  @Prop({ index: true, required: true }) tenantId: string;

  // --- Datos personales ---
  @Prop({ required: true }) firstName: string;
  @Prop({ required: true }) lastName: string;
  @Prop() documentType?: string;            // DNI, CI, pasaporte
  @Prop({ index: true }) documentNumber?: string;
  @Prop() birthDate?: Date;
  @Prop({ enum: SEX_VALUES }) sex?: string;
  @Prop() occupation?: string;

  // --- Contacto ---
  @Prop() email?: string;
  @Prop() phone?: string;                   // E.164 (normalizado en el service)
  @Prop({ type: Object })
  address?: { street?: string; city?: string; state?: string; zip?: string; country?: string };
  @Prop({ type: Object })
  emergencyContact?: { name?: string; phone?: string; relation?: string };

  // --- Anamnesis / antecedentes médicos ---
  @Prop({ type: Object }) medicalHistory?: MedicalHistory;

  /** Idea #7: estado inicial del odontograma (uno por diente, se reemplaza al editar) */
  @Prop({ type: [Object], default: [] }) toothConditions?: ToothConditionEntry[];

  // --- Metadatos ---
  @Prop() referralSource?: string;          // marketing/analytics
  @Prop({ default: 'active', enum: PATIENT_STATUSES }) status: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional' })
  primaryProviderId?: Types.ObjectId;
  @Prop() consentSignedAt?: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' }) createdBy?: Types.ObjectId; // HU-P1
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// Documento único por tenant (HU-P1) — parcial: solo aplica cuando hay documentNumber
PatientSchema.index(
  { tenantId: 1, documentNumber: 1 },
  { unique: true, partialFilterExpression: { documentNumber: { $type: 'string' } } },
);
PatientSchema.index({ tenantId: 1, lastName: 1 });
// Índice de texto para el buscador (spec Módulo 1); si escala → Atlas Search ($search)
PatientSchema.index({ firstName: 'text', lastName: 'text', documentNumber: 'text' });
