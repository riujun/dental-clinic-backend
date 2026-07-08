// DONE: Paso 10b - DTOs de Agenda/Citas
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { SPECIALTIES } from '../../professionals/schemas/professional.schema';
import { APPOINTMENT_STATUSES } from '../schemas/appointment.schema';
import type { AppointmentStatus } from '../schemas/appointment.schema';

export class CreateAppointmentDto {
  @IsMongoId() patientId: string;

  @IsMongoId() professionalId: string;

  @Type(() => Date) @IsDate() startAt: Date;

  @Type(() => Date) @IsDate() endAt: Date;

  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;

  /** HU-E2: si el doctor no tiene esta especialidad, la respuesta trae specialtyWarning */
  @IsOptional() @IsIn(SPECIALTIES) requiredSpecialty?: string;

  @IsOptional() @IsMongoId() treatmentPlanId?: string;
}

/** Reagendar / editar (solo citas scheduled/confirmed) */
export class UpdateAppointmentDto {
  @IsOptional() @Type(() => Date) @IsDate() startAt?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endAt?: Date;
  @IsOptional() @IsMongoId() professionalId?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ChangeAppointmentStatusDto {
  @IsIn(APPOINTMENT_STATUSES.filter((s) => s !== 'scheduled'))
  status: Exclude<AppointmentStatus, 'scheduled'>;

  /** Motivo (cancelaciones) */
  @IsOptional() @IsString() reason?: string;
}

export class QueryAppointmentsDto {
  @IsOptional() @IsMongoId() professionalId?: string;
  @IsOptional() @IsMongoId() patientId?: string;
  @IsOptional() @IsIn(APPOINTMENT_STATUSES) status?: AppointmentStatus;
  @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}
