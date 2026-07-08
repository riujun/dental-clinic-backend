// DONE: Paso 9 - módulo Pagos (Módulo 8.1 de la spec, crítico MVP)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProcedureInstance,
  ProcedureInstanceSchema,
} from '../procedures/schemas/procedure-instance.schema';
import {
  PatientAccountController,
  PaymentsController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: ProcedureInstance.name, schema: ProcedureInstanceSchema },
    ]),
  ],
  controllers: [PaymentsController, PatientAccountController],
  providers: [PaymentsService],
  // CashRegister (caja diaria) consulta pagos; Fase 2: comisión-sobre-cobranza
  exports: [PaymentsService],
})
export class PaymentsModule {}
