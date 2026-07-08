// DONE: Paso 2 - schema AuditLog (Módulo 8.3, crítico MVP: transversal desde el día 1)
// Registra quién hizo qué sobre qué entidad (datos de salud → auditoría obligatoria).
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  collection: 'audit_logs',
  timestamps: { createdAt: true, updatedAt: false }, // un log nunca se modifica
})
export class AuditLog {
  @Prop({ index: true, required: true }) tenantId: string;

  /** Acción en formato entidad.verbo, ej.: 'procedure.completed', 'fee.price_updated' */
  @Prop({ required: true }) action: string;

  /** Nombre del modelo afectado, ej.: 'ProcedureInstance', 'FeeItem' */
  @Prop({ required: true }) entityType: string;

  @Prop() entityId?: string;

  /** Usuario que ejecutó la acción (ref User cuando exista auth) */
  @Prop() userId?: string;

  /** Estado relevante antes/después del cambio (solo campos que cambian) */
  @Prop({ type: Object }) before?: Record<string, unknown>;
  @Prop({ type: Object }) after?: Record<string, unknown>;

  @Prop() ip?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Consultas típicas: "historial de esta entidad" y "actividad reciente del tenant"
AuditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
