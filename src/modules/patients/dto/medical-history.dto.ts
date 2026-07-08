// DONE: Paso 4 - DTO de anamnesis (todo opcional: la spec permite guardado parcial, HU-P1)
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SMOKER_VALUES } from '../schemas/patient.schema';

class AllergyDto {
  @IsString() substance: string;
  @IsOptional() @IsString() reaction?: string;
  @IsOptional() @IsString() severity?: string;
}

class MedicationDto {
  @IsString() name: string;
  @IsOptional() @IsString() dose?: string;
  @IsOptional() @IsString() frequency?: string;
}

export class MedicalHistoryDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllergyDto)
  allergies?: AllergyDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications?: MedicationDto[];

  @IsOptional() @IsArray() @IsString({ each: true }) conditions?: string[];
  @IsOptional() @IsBoolean() bisphosphonates?: boolean;
  @IsOptional() @IsBoolean() requiresPremedication?: boolean;
  @IsOptional() @IsBoolean() isPregnant?: boolean;
  @IsOptional() @IsIn(SMOKER_VALUES) smoker?: (typeof SMOKER_VALUES)[number];
  @IsOptional() @Type(() => Date) @IsDate() lastMedicalReview?: Date;
  @IsOptional() @IsString() freeNotes?: string;
}
