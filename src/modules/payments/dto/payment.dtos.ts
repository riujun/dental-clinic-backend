// DONE: Paso 9 - DTOs de Pagos (Módulo 8.1)
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PAYMENT_METHODS } from '../schemas/payment.schema';
import type { PaymentMethod } from '../schemas/payment.schema';

class PaymentApplicationDto {
  @IsMongoId() procedureId: string;

  @IsNumber() @Min(0.01) amount: number;
}

export class CreatePaymentDto {
  @IsMongoId() patientId: string;

  @IsNumber() @Min(0.01) amount: number;

  @IsIn(PAYMENT_METHODS) method: PaymentMethod;

  /** Default: ahora */
  @IsOptional() @Type(() => Date) @IsDate() paidAt?: Date;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentApplicationDto)
  applications?: PaymentApplicationDto[];

  @IsOptional() @IsString() notes?: string;
}

export class QueryPaymentsDto {
  @IsOptional() @IsMongoId() patientId?: string;

  @IsOptional() @IsIn(PAYMENT_METHODS) method?: PaymentMethod;

  @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

export class VoidPaymentDto {
  @IsOptional() @IsString() reason?: string;
}
