// DONE: Paso 2 - decorador @TenantId() usado por todos los controllers de la spec
// TODO: pendiente módulo Auth - derivar tenantId del JWT (req.user.tenantId) en vez del header
import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

interface RequestWithTenant extends Request {
  tenantId?: string; // lo poblará el guard de auth (paso posterior)
}

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<RequestWithTenant>();
    // Mientras no exista auth, se acepta el header x-tenant-id (solo desarrollo).
    const tenantId = req.tenantId ?? req.headers['x-tenant-id'];
    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException(
        'tenantId ausente: se requiere sesión autenticada o header x-tenant-id (dev)',
      );
    }
    return tenantId;
  },
);
