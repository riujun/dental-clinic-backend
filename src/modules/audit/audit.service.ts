// DONE: Paso 2 - AuditService transversal (Módulo 8.3)
// Los módulos de dominio lo inyectan y llaman audit.log(...) en cada operación sensible:
// completar procedimiento, cambiar precio, borrar datos, registrar pago, etc.
// TODO: pendiente Paso 9 - endpoint de consulta del audit log (filtros por entidad/usuario/fecha)
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

export interface AuditEntry {
  tenantId: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>,
  ) {}

  /**
   * Registra la entrada sin bloquear la operación de negocio: si la escritura del
   * log falla, se reporta el error pero la operación principal no se revierte.
   */
  log(entry: AuditEntry): void {
    void this.auditModel.create(entry).catch((err: Error) => {
      this.logger.error(
        `No se pudo escribir audit log (${entry.action} ${entry.entityType}/${entry.entityId ?? '-'}): ${err.message}`,
      );
    });
  }
}
