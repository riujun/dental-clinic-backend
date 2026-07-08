// DONE: Paso 4 - DTO de alta de paciente (HU-P1: solo nombre y apellido obligatorios)
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SEX_VALUES } from '../schemas/patient.schema';
import { MedicalHistoryDto } from './medical-history.dto';

class AddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zip?: string;
  @IsOptional() @IsString() country?: string;
}

class EmergencyContactDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() relation?: string;
}

export class CreatePatientDto {
  @IsString() firstName: string;
  @IsString() lastName: string;

  @IsOptional() @IsString() documentType?: string;
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @Type(() => Date) @IsDate() birthDate?: Date;
  @IsOptional() @IsIn(SEX_VALUES) sex?: string;
  @IsOptional() @IsString() occupation?: string;

  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;

  @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalHistoryDto)
  medicalHistory?: MedicalHistoryDto;

  @IsOptional() @IsString() referralSource?: string;
  @IsOptional() @IsMongoId() primaryProviderId?: string;
  @IsOptional() @Type(() => Date) @IsDate() consentSignedAt?: Date;
}
