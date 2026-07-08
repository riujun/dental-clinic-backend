// DONE: Paso 3 - DTO de alta de procedimiento (nace como 'planned')
import {
  IsArray,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const FDI_SURFACES = ['M', 'O', 'D', 'V', 'L'] as const;

export class CreateProcedureDto {
  @IsMongoId()
  patientId: string;

  @IsOptional()
  @IsMongoId()
  treatmentPlanId?: string;

  @IsString()
  code: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  toothFdi?: string;

  @IsOptional()
  @IsArray()
  @IsIn(FDI_SURFACES, { each: true })
  surfaces?: string[];

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  category?: string;
}
