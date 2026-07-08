// DONE: Paso 8 - endpoints de Liquidaciones (Módulo 6)
// TODO: pendiente módulo Auth - solo administrador liquida y paga (CASL)
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CommissionsService } from './commissions.service';
import { CreateSettlementDto, QuerySettlementsDto } from './dto/commission.dtos';

@Controller('commissions/settlements')
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  /** HU-C2: genera la liquidación draft de un doctor por periodo */
  @Post()
  settle(@TenantId() tenantId: string, @Body() dto: CreateSettlementDto) {
    return this.commissions.settle(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QuerySettlementsDto) {
    return this.commissions.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.commissions.findOne(tenantId, id);
  }

  @Post(':id/close')
  close(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.commissions.close(tenantId, id);
  }

  @Post(':id/pay')
  pay(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.commissions.markPaid(tenantId, id);
  }

  /** Excel de la liquidación (lista congelada de procedimientos, mismo formato HU-R2) */
  @Get(':id/export.xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="liquidacion.xlsx"')
  async export(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.commissions.exportXlsx(tenantId, id));
  }
}
