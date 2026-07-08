// DONE: Paso 8 - DTOs de liquidaciones (Módulo 6)
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsMongoId, IsOptional } from 'class-validator';
import { SETTLEMENT_STATUSES } from '../schemas/commission-settlement.schema';

export class CreateSettlementDto {
  @IsMongoId() providerId: string;

  @Type(() => Date) @IsDate() from: Date;

  @Type(() => Date) @IsDate() to: Date;
}

export class QuerySettlementsDto {
  @IsOptional() @IsMongoId() providerId?: string;

  @IsOptional() @IsIn(SETTLEMENT_STATUSES)
  status?: (typeof SETTLEMENT_STATUSES)[number];
}
