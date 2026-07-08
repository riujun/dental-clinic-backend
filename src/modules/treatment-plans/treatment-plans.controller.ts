// DONE: Paso 6 - endpoints de Presupuestos (Módulo 2)
// TODO: pendiente módulo Auth - guards CASL por rol y userId real en cada operación
// TODO: pendiente frontend - GET :id/pdf (desglose por prioridad, HU-B2)
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  ChangePlanStatusDto,
  CompletePlanItemDto,
  CreateTreatmentPlanDto,
  QueryPlansDto,
  UpdateTreatmentPlanDto,
} from './dto/treatment-plan.dtos';
import { TreatmentPlansService } from './treatment-plans.service';

@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly plans: TreatmentPlansService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateTreatmentPlanDto) {
    return this.plans.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QueryPlansDto) {
    return this.plans.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.plans.findOne(tenantId, id);
  }

  /** Solo DRAFT (HU-B4: snapshots inmutables tras emitir) */
  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentPlanDto,
  ) {
    return this.plans.update(tenantId, id, dto);
  }

  /** Transiciones: DRAFT→PRESENTED→ACCEPTED/REJECTED; cualquiera→CANCELLED */
  @Post(':id/status')
  changeStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ChangePlanStatusDto,
  ) {
    return this.plans.changeStatus(tenantId, id, dto);
  }

  /** HU-B3: activa este plan (Plan A/B) y desactiva el anterior */
  @Post(':id/activate')
  activate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.plans.activate(tenantId, id);
  }

  /** Marca un ítem como realizado → crea ProcedureInstance y avanza el plan */
  @Post(':id/items/:itemId/complete')
  completeItem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: CompletePlanItemDto,
  ) {
    return this.plans.completeItem(tenantId, id, itemId, dto);
  }
}
