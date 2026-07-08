// DONE: Paso 9 - endpoints de Pagos y estado de cuenta (Módulo 8.1)
// TODO: pendiente módulo Auth - recepción registra pagos, solo admin anula (CASL)
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  CreatePaymentDto,
  QueryPaymentsDto,
  VoidPaymentDto,
} from './dto/payment.dtos';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreatePaymentDto) {
    return this.payments.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() q: QueryPaymentsDto) {
    return this.payments.findAll(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.payments.findOne(tenantId, id);
  }

  /** Anulación (no borrado): datos contables se conservan con motivo + audit */
  @Post(':id/void')
  void(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: VoidPaymentDto,
  ) {
    return this.payments.void(tenantId, id, dto);
  }
}

/** Estado de cuenta como sub-recurso del paciente (pestaña (e) del perfil 360°) */
@Controller('patients/:patientId/account')
export class PatientAccountController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  account(@TenantId() tenantId: string, @Param('patientId') patientId: string) {
    return this.payments.accountStatement(tenantId, patientId);
  }
}
