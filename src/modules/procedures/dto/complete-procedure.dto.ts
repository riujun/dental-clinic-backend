// DONE: Paso 3 - DTO del endpoint PATCH /procedures/:id/complete (spec Módulo 5)
import { Type } from 'class-transformer';
import {
  IsDate,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CompleteProcedureDto {
  @IsMongoId()
  performedByProviderId: string;

  /** Por defecto: ahora. Recepción puede indicar otra fecha (ej. carga al día siguiente). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedAt?: Date;

  /** Permite ajustar el valor final cobrado; si se omite se mantiene el snapshot. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  /** Historial clínico: qué se hizo — el doctor puede cargarlo aquí mismo o
   *  después con PATCH /procedures/:id/clinical-note */
  @IsOptional()
  @IsString()
  clinicalNote?: string;
}

export class ClinicalNoteDto {
  @IsString()
  clinicalNote: string;
}
