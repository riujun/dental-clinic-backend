// DONE: Paso 10 - DTOs de Tenants (provisión por super_admin)
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @IsString() name: string;

  /** Slug del dominio de acceso: minúsculas, números y guiones (ej. "sonrisas") */
  @Matches(/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$/, {
    message: 'subdomain: solo minúsculas, números y guiones (3-40 caracteres)',
  })
  subdomain: string;

  @IsEmail() adminEmail: string;

  @IsString() adminFullName: string;

  /** Si se omite se genera una contraseña temporal (devuelta una sola vez) */
  @IsOptional() @IsString() @MinLength(8) adminPassword?: string;
}

export class SetTenantStatusDto {
  @IsIn(['active', 'suspended']) status: 'active' | 'suspended';
}
