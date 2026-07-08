// DONE: Paso 4 - actualización parcial de datos personales/contacto
// La anamnesis se actualiza por su propio endpoint (PATCH :id/anamnesis) para
// versionarla correctamente (HU-P3).
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(
  OmitType(CreatePatientDto, ['medicalHistory'] as const),
) {}
