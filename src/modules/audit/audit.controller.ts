// DONE: Paso 9 - consulta del audit log (Módulo 8.3): quién hizo qué y cuándo
// TODO: pendiente módulo Auth - solo administrador consulta auditoría (CASL)
import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Model, QueryFilter } from 'mongoose';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AuditLog } from './schemas/audit-log.schema';

class QueryAuditDto {
  @IsOptional() @IsString() action?: string;       // ej. 'procedure.completed'
  @IsOptional() @IsString() entityType?: string;   // ej. 'Patient'
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @IsOptional() @Type(() => Date) @IsDate() to?: Date;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}

@Controller('audit')
export class AuditController {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>,
  ) {}

  @Get()
  async find(@TenantId() tenantId: string, @Query() q: QueryAuditDto) {
    const filter: QueryFilter<AuditLog> = { tenantId };
    if (q.action) filter.action = q.action;
    if (q.entityType) filter.entityType = q.entityType;
    if (q.entityId) filter.entityId = q.entityId;
    if (q.userId) filter.userId = q.userId;
    if (q.from || q.to) {
      filter.createdAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      } as never;
    }
    return this.auditModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(q.limit ?? 100)
      .exec();
  }
}
