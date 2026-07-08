// DONE: Comunicaciones Etapa A - plantillas de mensajes editables por clínica
// (ver docs/comunicaciones-y-seguimiento.md)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageTemplateDocument = HydratedDocument<MessageTemplate>;

export const TEMPLATE_KEYS = [
  'cita_confirmacion',
  'recordatorio_dia',
  'seguimiento_reagendar',
  'cumpleanos',
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/** Defaults "buenos pero modificables" (requerimiento de Fabián) */
export const DEFAULT_TEMPLATES: Record<TemplateKey, { name: string; body: string }> = {
  cita_confirmacion: {
    name: 'Confirmación al agendar',
    body:
      'Hola {paciente} 👋 Te confirmamos tu cita en {clinica} para el {fecha} a las {hora} con {doctor}.{motivo} ' +
      'Si no puedes asistir, avísanos respondiendo este mensaje. ¡Te esperamos! 🦷',
  },
  recordatorio_dia: {
    name: 'Recordatorio del día',
    body:
      'Hola {paciente} 👋 Te recordamos tu cita de HOY a las {hora} con {doctor} en {clinica}.{motivo} ' +
      'Si no puedes asistir, avísanos con anticipación para reagendarte. ¡Te esperamos! 🦷',
  },
  seguimiento_reagendar: {
    name: 'Seguimiento para reagendar',
    body:
      'Hola {paciente} 👋 Vimos que no pudiste asistir a tu última cita en {clinica}. ' +
      'Tu salud dental nos importa: ¿qué día y horario te acomodan para reagendar? Quedamos atentos 🦷',
  },
  cumpleanos: {
    name: 'Saludo de cumpleaños',
    body:
      '¡Feliz cumpleaños, {paciente}! 🎂🎉 Todo el equipo de {clinica} te desea un día maravilloso. ' +
      'Que lo pases increíble — ¡y que tu sonrisa brille más que las velas! 🦷✨',
  },
};

@Schema({ timestamps: true, collection: 'message_templates' })
export class MessageTemplate {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: String, enum: TEMPLATE_KEYS, required: true })
  key: TemplateKey;

  @Prop({ required: true }) body: string;
}

export const MessageTemplateSchema = SchemaFactory.createForClass(MessageTemplate);
MessageTemplateSchema.index({ tenantId: 1, key: 1 }, { unique: true });
