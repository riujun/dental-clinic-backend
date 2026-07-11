// DONE: Paso 9 - endpoint de caja diaria (Módulo 8.2)
// DONE: Fix bug crítico de zona horaria (Fabián 2026-07-08): el backend YA NO
// adivina el "día" a partir de una fecha suelta (eso asumía que el servidor
// corre en la misma zona horaria que el usuario — cierto en local, FALSO en
// Railway que corre en UTC). Ahora recibe from/to ISO explícitos, calculados
// por el navegador (que sí conoce la hora local real) vía dayRangeISO().
// TODO: pendiente Fase 2 - "cierre" formal de caja con firma del responsable
import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CashRegisterService } from './cash-register.service';

class DailyQueryDto {
  @Type(() => Date) @IsDate() from: Date;
  @Type(() => Date) @IsDate() to: Date;
}

@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegister: CashRegisterService) {}

  /** Day Sheet: cobros del rango por método + producción del rango */
  @Get('daily')
  daily(@TenantId() tenantId: string, @Query() q: DailyQueryDto) {
    return this.cashRegister.daily(tenantId, q.from, q.to);
  }
}
