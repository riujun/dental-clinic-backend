// DONE: Paso 9 - módulo Caja diaria (Módulo 8.2 de la spec, crítico MVP)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import {
  ProcedureInstance,
  ProcedureInstanceSchema,
} from '../procedures/schemas/procedure-instance.schema';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: ProcedureInstance.name, schema: ProcedureInstanceSchema },
    ]),
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
})
export class CashRegisterModule {}
