// DONE: Paso 10 - login por subdominio de clínica + seed del primer super_admin
// TODO: pendiente Fase 2 - cambio de contraseña obligatorio en primer login,
//       recuperación por email (Resend), refresh tokens
import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtUser } from '../../common/decorators/auth.decorators';
import { TenantsService } from '../tenants/tenants.service';
import { PLATFORM_TENANT } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/auth.dtos';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly tenants: TenantsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Siembra el primer super_admin desde env (solo si no existe ninguno) */
  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL');
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD');
    if (!email || !password) return;
    if (await this.users.existsRole(PLATFORM_TENANT, 'super_admin')) return;

    await this.users.createRaw({
      tenantId: PLATFORM_TENANT,
      email,
      password,
      fullName: 'Super Admin',
      role: 'super_admin',
    });
    this.logger.log(`Super admin inicial creado: ${email}`);
  }

  /**
   * Login: con `tenant` (subdominio) entra a su clínica; sin `tenant` se asume
   * usuario de plataforma (super_admin).
   */
  async login(dto: LoginDto) {
    let tenantId = PLATFORM_TENANT;
    let tenantName = 'Plataforma';
    if (dto.tenant) {
      const tenant = await this.tenants.findBySubdomain(dto.tenant);
      if (!tenant) throw new UnauthorizedException('Clínica no encontrada');
      if (tenant.status === 'suspended') {
        throw new ForbiddenException('La clínica está suspendida — contacte a soporte');
      }
      tenantId = tenant.id as string;
      tenantName = tenant.name; // usado por el front en las plantillas ({clinica})
    }

    const user = await this.users.findByEmail(tenantId, dto.email);
    if (!user || !user.active || !(await this.users.verifyPassword(user, dto.password))) {
      // Mensaje único: no revelar si el email existe
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtUser = {
      sub: user.id as string,
      tenantId,
      role: user.role,
      email: user.email,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id as string,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId,
        tenantName,
        professionalId: user.professionalId,
      },
    };
  }
}
