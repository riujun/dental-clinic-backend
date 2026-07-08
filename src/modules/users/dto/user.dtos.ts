// DONE: Paso 10 - DTOs de Usuarios (equipo de la clínica)
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SPECIALTIES } from '../../professionals/schemas/professional.schema';

/** Roles asignables por el admin de la clínica (super_admin solo por seed/plataforma) */
const TENANT_ROLES = ['admin', 'doctor', 'receptionist', 'assistant'] as const;

class ProfessionalDataDto {
  @IsOptional() @IsString() licenseNumber?: string;

  @IsOptional() @IsArray() @IsIn(SPECIALTIES, { each: true })
  specialties?: string[];

  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRate?: number;
}

export class CreateUserDto {
  @IsEmail() email: string;

  @IsString() @MinLength(8) password: string;

  @IsString() fullName: string;

  @IsIn(TENANT_ROLES) role: (typeof TENANT_ROLES)[number];

  /** Solo aplica cuando role='doctor': crea el Professional vinculado */
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfessionalDataDto)
  professional?: ProfessionalDataDto;
}

export class UpdateUserDto {
  @IsOptional() @IsString() fullName?: string;

  @IsOptional() @IsBoolean() active?: boolean;

  @IsOptional() @IsString() @MinLength(8) password?: string;
}
