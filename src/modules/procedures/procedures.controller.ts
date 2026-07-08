// DONE: Paso 3 - endpoints de ProcedureInstance (spec Módulo 5)
// TODO: pendiente módulo Auth - guards CASL por rol (recepción/doctor pueden completar)
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
import { CompleteProcedureDto } from './dto/complete-procedure.dto';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { QueryProceduresDto } from './dto/query-procedures.dto';
import { RefundProcedureDto } from './dto/refund-procedure.dto';
import { ProceduresService } from './procedures.service';

@Controller('procedures')
export class ProceduresController {
  constructor(private readonly procedures: ProceduresService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateProcedureDto) {
    return this.procedures.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QueryProceduresDto) {
    return this.procedures.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.procedures.findOne(tenantId, id);
  }

  @Patch(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CompleteProcedureDto,
  ) {
    // TODO: pendiente módulo Auth - pasar req.user.id como completedByUserId
    return this.procedures.complete(tenantId, id, dto);
  }

  /** HU-C3: reembolso (total o parcial) — ajuste negativo de producción y comisión */
  @Post(':id/refund')
  refund(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RefundProcedureDto,
  ) {
    return this.procedures.refund(tenantId, id, dto);
  }
}
