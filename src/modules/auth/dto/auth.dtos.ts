// DONE: Paso 10 - DTO de login
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;

  @IsString() password: string;

  /** Subdominio de la clínica (el front lo lee de la URL); omitir para super_admin */
  @IsOptional() @IsString() tenant?: string;
}
