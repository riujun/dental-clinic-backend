// DONE: Paso 5 - endpoints de Aranceles (Módulo 3)
// TODO: pendiente módulo Auth - restringir a rol administrador (CASL)
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  CreateFeeItemDto,
  CreateFeeScheduleDto,
  IncreasePricesDto,
  UpdateFeeItemDto,
  UpdateFeeScheduleDto,
} from './dto/fee-schedule.dtos';
import { FeeImportService } from './fee-import.service';
import { FeeSchedulesService } from './fee-schedules.service';

const MAX_XLSX_BYTES = 5 * 1024 * 1024; // 5 MB (archivos de aranceles son pequeños)
const XLSX_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

@Controller('fee-schedules')
export class FeeSchedulesController {
  constructor(
    private readonly fees: FeeSchedulesService,
    private readonly importer: FeeImportService,
  ) {}

  // ---------- Plantilla (ruta estática ANTES de :id) ----------

  @Get('template.xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="plantilla-aranceles.xlsx"')
  async template(): Promise<StreamableFile> {
    return new StreamableFile(await this.importer.buildTemplate());
  }

  // ---------- Listas ----------

  @Post()
  createSchedule(@TenantId() tenantId: string, @Body() dto: CreateFeeScheduleDto) {
    return this.fees.createSchedule(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.fees.findAllSchedules(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.fees.findSchedule(tenantId, id);
  }

  @Patch(':id')
  updateSchedule(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFeeScheduleDto,
  ) {
    return this.fees.updateSchedule(tenantId, id, dto);
  }

  // ---------- Ítems ----------

  @Get(':id/items')
  findItems(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('search') search?: string,
  ) {
    return this.fees.findItems(tenantId, id, search);
  }

  @Post(':id/items')
  createItem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateFeeItemDto,
  ) {
    return this.fees.createItem(tenantId, id, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @TenantId() tenantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateFeeItemDto,
  ) {
    return this.fees.updateItem(tenantId, itemId, dto);
  }

  // ---------- Importación Excel (HU-A1) ----------

  @Post(':id/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // buffer en RAM, sin escribir a disco (spec Módulo 3)
      limits: { fileSize: MAX_XLSX_BYTES },
      fileFilter: (_req, file, cb) => {
        const ok = XLSX_MIMETYPES.includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Solo se aceptan archivos .xlsx'), ok);
      },
    }),
  )
  import(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_XLSX_BYTES })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.importer.importFromExcel(file.buffer, id, tenantId);
  }

  // ---------- Aumento % masivo (HU-A3) ----------

  @Post(':id/increase')
  increase(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: IncreasePricesDto,
  ) {
    return this.fees.increasePrices(tenantId, id, dto);
  }
}
