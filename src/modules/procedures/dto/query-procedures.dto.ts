// DONE: Paso 3 - filtros de listado (base del reporte de producción del Módulo 5)
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PROCEDURE_STATUSES } from '../schemas/procedure-instance.schema';
import type { ProcedureStatus } from '../schemas/procedure-instance.schema';

export class QueryProceduresDto {
  @IsOptional()
  @IsIn(PROCEDURE_STATUSES)
  status?: ProcedureStatus;

  @IsOptional()
  @IsMongoId()
  patientId?: string;

  @IsOptional()
  @IsMongoId()
  providerId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
