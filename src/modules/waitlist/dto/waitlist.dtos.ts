// DONE: Idea #8 - DTOs de Lista de espera
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { WAITLIST_STATUSES } from '../schemas/waitlist-entry.schema';
import type { WaitlistStatus } from '../schemas/waitlist-entry.schema';

export class CreateWaitlistEntryDto {
  @IsMongoId() patientId: string;

  @IsOptional() @IsMongoId() professionalId?: string;

  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @Type(() => Date) @IsDate() preferredFrom?: Date;
  @IsOptional() @Type(() => Date) @IsDate() preferredTo?: Date;
}

export class UpdateWaitlistEntryDto {
  @IsOptional() @IsMongoId() professionalId?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Date) @IsDate() preferredFrom?: Date;
  @IsOptional() @Type(() => Date) @IsDate() preferredTo?: Date;
}

export class ChangeWaitlistStatusDto {
  @IsIn(WAITLIST_STATUSES)
  status: WaitlistStatus;

  /** Cuando status = 'scheduled', vincula la cita recién creada */
  @IsOptional() @IsMongoId() appointmentId?: string;
}

export class QueryWaitlistDto {
  @IsOptional() @IsIn(WAITLIST_STATUSES) status?: WaitlistStatus;
  @IsOptional() @IsMongoId() professionalId?: string;
}

/** Sugerencia de matches al liberarse un horario (cancelación) */
export class QueryWaitlistMatchesDto {
  @IsOptional() @IsMongoId() professionalId?: string;
  @Type(() => Date) @IsDate() date: Date;
}
