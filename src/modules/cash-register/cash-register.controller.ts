// DONE: Paso 9 - endpoint de caja diaria (Módulo 8.2)
// TODO: pendiente Fase 2 - "cierre" formal de caja con firma del responsable
import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, Matches } from 'class-validator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CashRegisterService } from './cash-register.service';

class DailyQueryDto {
  /** YYYY-MM-DD interpretado en hora LOCAL del servidor (default: hoy).
   *  No usar Type(()=>Date): "2026-07-02" se parsearía como medianoche UTC,
   *  que en zonas UTC- es el día ANTERIOR. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
}

@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegister: CashRegisterService) {}

  /** Day Sheet: cobros del día por método + producción del día */
  @Get('daily')
  daily(@TenantId() tenantId: string, @Query() q: DailyQueryDto) {
    let date = new Date();
    if (q.date) {
      const [y, m, d] = q.date.split('-').map(Number);
      date = new Date(y, m - 1, d); // hora local
    }
    return this.cashRegister.daily(tenantId, date);
  }
}
