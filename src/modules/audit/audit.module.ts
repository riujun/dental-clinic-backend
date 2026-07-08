// DONE: Paso 2 - módulo Audit global (Módulo 8.3): cualquier módulo puede inyectar AuditService
// DONE: Paso 9 - endpoint de consulta GET /api/audit (filtros por acción/entidad/usuario/fecha)
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
