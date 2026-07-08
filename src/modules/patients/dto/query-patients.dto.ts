// DONE: Paso 4 - filtros del listado/buscador de pacientes
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PATIENT_STATUSES } from '../schemas/patient.schema';

export class QueryPatientsDto {
  /** Busca por nombre, apellido o número de documento (prefijos incluidos) */
  @IsOptional() @IsString() search?: string;

  @IsOptional() @IsIn(PATIENT_STATUSES) status?: (typeof PATIENT_STATUSES)[number];
}
