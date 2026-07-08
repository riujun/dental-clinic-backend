// DONE: Paso 10b - endpoints de Agenda/Citas
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import type { JwtUser } from '../../common/decorators/auth.decorators';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AppointmentsService } from './appointments.service';
import {
  ChangeAppointmentStatusDto,
  CreateAppointmentDto,
  QueryAppointmentsDto,
  UpdateAppointmentDto,
} from './dto/appointment.dtos';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  /** Respuesta incluye specialtyWarning (HU-E2) — el front muestra la advertencia */
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.appointments.create(tenantId, dto, user?.sub);
  }

  /** Agenda: ?professionalId=&from=&to= (vista día/semana del front) */
  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QueryAppointmentsDto) {
    return this.appointments.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.appointments.findOne(tenantId, id);
  }

  /** Reagendar / editar (revalida solapamiento) */
  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.appointments.update(tenantId, id, dto, user?.sub);
  }

  /** Etapa A comunicaciones: marca "recordatorio enviado" (wa.me manual) */
  @Post(':id/reminder-sent')
  reminderSent(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.appointments.reminderSent(tenantId, id, user?.sub);
  }

  /** confirmed / completed / cancelled / no_show */
  @Post(':id/status')
  changeStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ChangeAppointmentStatusDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.appointments.changeStatus(tenantId, id, dto, user?.sub);
  }
}
