// DONE: Paso 10 - guard de roles RBAC (@Roles)
// TODO: pendiente Fase 2 - migrar a CASL para reglas por campo/registro (spec)
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtUser, ROLES_KEY } from '../../../common/decorators/auth.decorators';
import { Role } from '../../users/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: JwtUser }>();
    // Sin user = vía dev con x-tenant-id (JwtAuthGuard la permitió): se tolera
    if (!user) return true;

    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Requiere rol: ${required.join(' o ')} (tu rol: ${user.role})`,
      );
    }
    return true;
  }
}
