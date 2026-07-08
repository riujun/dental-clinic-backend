// DONE: Paso 10 - endpoints de equipo: el admin de la clínica agrega a sus doctores
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import type { JwtUser } from '../../common/decorators/auth.decorators';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Solo el admin de la clínica gestiona su equipo */
  @Post()
  @Roles('admin')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.users.create(tenantId, dto, user?.sub);
  }

  @Get()
  @Roles('admin')
  findAll(@TenantId() tenantId: string) {
    return this.users.findAll(tenantId);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.users.update(tenantId, id, dto, user?.sub);
  }
}
