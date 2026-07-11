// DONE: Paso 6 - DTOs de Presupuestos (Módulo 2)
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { FDI_SURFACES } from '../../procedures/dto/create-procedure.dto';

/** Ítem del presupuesto: con feeItemId el precio/código se autocompletan del arancel
 *  (HU-B1) pero unitPrice es editable; sin feeItemId debe venir todo manual. */
export class CreatePlanItemDto {
  @IsOptional() @IsMongoId() feeItemId?: string;

  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() toothFdi?: string;
  @IsOptional() @IsArray() @IsIn(FDI_SURFACES, { each: true }) surfaces?: string[];

  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsInt() @Min(1) priority?: number;

  @IsOptional() @IsMongoId() assignedProviderId?: string;
}

export class CreateTreatmentPlanDto {
  @IsMongoId() patientId: string;

  @IsOptional() @IsString() title?: string;

  /** Si se omite se usa la lista de precios default del tenant (HU-A2) */
  @IsOptional() @IsMongoId() feeScheduleId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanItemDto)
  items?: CreatePlanItemDto[];
}

/** Solo editable en DRAFT (HU-B4: snapshots inmutables tras emitir) */
export class UpdateTreatmentPlanDto {
  @IsOptional() @IsString() title?: string;

  @IsOptional() @IsMongoId() feeScheduleId?: string;

  /** Reemplaza el listado completo de ítems (solo en DRAFT) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanItemDto)
  items?: CreatePlanItemDto[];
}

/** Transiciones manuales; IN_PROGRESS/COMPLETED son automáticas al completar ítems */
export class ChangePlanStatusDto {
  @IsIn(['PRESENTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'])
  status: 'PRESENTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
}

/** HU-R1 vía presupuesto: marcar un ítem como realizado */
export class CompletePlanItemDto {
  @IsMongoId() performedByProviderId: string;

  @IsOptional() @Type(() => Date) @IsDate() completedAt?: Date;

  /** Valor final cobrado; si se omite se usa el subtotal del ítem (snapshot) */
  @IsOptional() @IsNumber() @Min(0) value?: number;

  /** Historial clínico: qué le hizo el doctor al paciente en este ítem */
  @IsOptional() @IsString() clinicalNote?: string;
}

export class QueryPlansDto {
  @IsOptional() @IsMongoId() patientId?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PRESENTED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: string;
}
