// DONE: Paso 7 - DTOs de Profesionales (Módulo 4)
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import { SPECIALTIES } from '../schemas/professional.schema';

class CommissionOverrideDto {
  @IsString() category: string;

  /** 0.4 = 40% */
  @IsNumber() @Min(0) @Max(1) rate: number;
}

export class CreateProfessionalDto {
  @IsString() fullName: string;

  @IsOptional() @IsMongoId() userId?: string;
  @IsOptional() @IsString() licenseNumber?: string;

  @IsOptional() @IsArray() @IsIn(SPECIALTIES, { each: true })
  specialties?: string[];

  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() active?: boolean;

  /** Rate global obligatorio con default 50% (HU-C1) */
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionOverrideDto)
  commissionOverrides?: CommissionOverrideDto[];
}

export class UpdateProfessionalDto extends PartialType(CreateProfessionalDto) {}

export class QueryProfessionalsDto {
  /** HU-E2: filtra doctores capacitados para un procedimiento */
  @IsOptional() @IsIn(SPECIALTIES) specialty?: string;

  @IsOptional() @IsBoolean() @Type(() => Boolean) includeInactive?: boolean;
}
