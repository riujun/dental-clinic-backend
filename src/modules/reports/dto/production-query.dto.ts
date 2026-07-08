// DONE: Paso 7 - filtros del reporte de producción (HU-R2: rango de fechas + doctor)
import { Type } from 'class-transformer';
import { IsDate, IsMongoId, IsOptional } from 'class-validator';

export class ProductionQueryDto {
  @Type(() => Date) @IsDate() from: Date;

  @Type(() => Date) @IsDate() to: Date;

  @IsOptional() @IsMongoId() providerId?: string;
}
