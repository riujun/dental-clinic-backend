// DONE: Paso 10 - decoradores de auth: @Public(), @Roles(), @CurrentUser()
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../../modules/users/schemas/user.schema';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca un endpoint como accesible sin token (login, health) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restringe el endpoint a los roles indicados */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface JwtUser {
  sub: string;       // userId
  tenantId: string;
  role: Role;
  email: string;
}

/** Usuario autenticado del token (para createdBy/completedBy) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    return req.user;
  },
);
