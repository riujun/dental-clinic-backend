// DONE: Paso 4 - endpoints de Pacientes (Módulo 1)
// TODO: pendiente módulo Auth - guards CASL (can('read'|'update', 'Patient')) y userId real
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { MedicalHistoryDto } from './dto/medical-history.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreatePatientDto) {
    return this.patients.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QueryPatientsDto) {
    return this.patients.findAll(tenantId, q);
  }

  /** Perfil 360° (HU-P2): incluye medicalAlerts y anamnesisOutdated para el encabezado */
  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.patients.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(tenantId, id, dto);
  }

  /** HU-P3: actualización de anamnesis versionada (audit log con fecha y usuario) */
  @Patch(':id/anamnesis')
  updateAnamnesis(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MedicalHistoryDto,
  ) {
    return this.patients.updateAnamnesis(tenantId, id, dto);
  }

  /** Borrado lógico (status='archived') — datos de salud nunca se eliminan físicamente */
  @Delete(':id')
  archive(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.patients.archive(tenantId, id);
  }
}
