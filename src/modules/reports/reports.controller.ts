// DONE: Paso 7 - endpoints de reportes (Módulo 5, HU-R2)
// TODO: pendiente módulo Auth - solo administrador exporta liquidaciones (CASL)
import {
  Controller,
  Get,
  Header,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorators';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ProductionQueryDto } from './dto/production-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** JSON para pantallas (producción por rango de fechas y doctor) */
  @Get('production')
  production(@TenantId() tenantId: string, @Query() q: ProductionQueryDto) {
    return this.reports.production(tenantId, q);
  }

  /** Idea #5: KPIs del dueño (producción, aceptación, no-show, cobranza…) */
  @Get('dashboard')
  dashboard(@TenantId() tenantId: string, @Query() q: ProductionQueryDto) {
    return this.reports.dashboard(tenantId, q.from, q.to);
  }

  /** Idea #9: respaldo COMPLETO del tenant (5 hojas) — solo el admin de la clínica */
  @Get('backup.xlsx')
  @Roles('admin')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="respaldo-clinica.xlsx"')
  async backup(@TenantId() tenantId: string): Promise<StreamableFile> {
    return new StreamableFile(await this.reports.backupXlsx(tenantId));
  }

  /** Descarga .xlsx estructurada para liquidaciones (patrón StreamableFile de NestJS) */
  @Get('production.xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="produccion.xlsx"')
  async productionXlsx(
    @TenantId() tenantId: string,
    @Query() q: ProductionQueryDto,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.reports.productionXlsx(tenantId, q));
  }
}
