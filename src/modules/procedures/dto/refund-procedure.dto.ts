// DONE: Paso 8 - DTO de reembolso (HU-C3)
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundProcedureDto {
  /** Monto a reembolsar; si se omite, reembolso total del procedimiento */
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;

  @IsOptional() @IsString() reason?: string;
}
