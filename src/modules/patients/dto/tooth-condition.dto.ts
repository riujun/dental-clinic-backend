// DONE: Idea #7 - DTO para estado inicial del odontograma
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TOOTH_CONDITIONS } from '../schemas/patient.schema';

export class SetToothConditionDto {
  @IsIn(TOOTH_CONDITIONS)
  condition: (typeof TOOTH_CONDITIONS)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}
