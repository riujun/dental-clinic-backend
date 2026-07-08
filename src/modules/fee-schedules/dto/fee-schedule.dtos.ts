// DONE: Paso 5 - DTOs de listas de precios e ítems (Módulo 3)
import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FEE_SCHEDULE_TYPES } from '../schemas/fee-schedule.schema';

export class CreateFeeScheduleDto {
  @IsString() name: string;

  @IsOptional() @IsIn(FEE_SCHEDULE_TYPES) type?: (typeof FEE_SCHEDULE_TYPES)[number];

  @IsOptional() @IsBoolean() isDefault?: boolean;

  @IsOptional() @IsMongoId() providerId?: string;
}

export class UpdateFeeScheduleDto extends PartialType(CreateFeeScheduleDto) {}

export class CreateFeeItemDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() category?: string;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateFeeItemDto extends PartialType(CreateFeeItemDto) {}

/** HU-A3: aumento masivo de precios con confirmación previa */
export class IncreasePricesDto {
  /** Porcentaje, ej. 10 = +10%, -5 = -5% */
  @IsNumber() @Min(-90) @Max(500) percent: number;

  /** false/ausente = solo preview (cuántos ítems se afectarían); true = aplica */
  @IsOptional() @IsBoolean() confirm?: boolean;
}
