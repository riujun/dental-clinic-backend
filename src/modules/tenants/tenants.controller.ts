// DONE: Paso 10 - panel de plataforma: solo super_admin crea/gestiona clínicas
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import type { JwtUser } from '../../common/decorators/auth.decorators';
import { CreateTenantDto, SetTenantStatusDto } from './dto/tenant.dtos';
import { TenantsService } from './tenants.service';

@Controller('admin/tenants')
@Roles('super_admin')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  /** Crea clínica + subdominio + admin inicial; devuelve la contraseña temporal UNA vez */
  @Post()
  create(@Body() dto: CreateTenantDto, @CurrentUser() user?: JwtUser) {
    return this.tenants.create(dto, user?.sub);
  }

  @Get()
  findAll() {
    return this.tenants.findAll();
  }

  /** Suspender/reactivar una clínica (login bloqueado mientras esté suspendida) */
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetTenantStatusDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.tenants.setStatus(id, dto.status, user?.sub);
  }
}
