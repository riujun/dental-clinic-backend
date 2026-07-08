// DONE: Paso 7 - endpoints de Profesionales (Módulo 4)
// TODO: pendiente módulo Auth - solo administrador configura comisiones (CASL)
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  CreateProfessionalDto,
  QueryProfessionalsDto,
  UpdateProfessionalDto,
} from './dto/professional.dtos';
import { ProfessionalsService } from './professionals.service';
import { SPECIALTIES } from './schemas/professional.schema';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  /** Catálogo de especialidades ADA (constante compartida con el front) */
  @Get('specialties')
  specialties() {
    return SPECIALTIES;
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateProfessionalDto) {
    return this.professionals.create(tenantId, dto);
  }

  /** HU-E2: ?specialty=endodontics devuelve solo doctores capacitados */
  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QueryProfessionalsDto) {
    return this.professionals.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.professionals.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionals.update(tenantId, id, dto);
  }
}
