// DONE: Paso 6 - módulo Presupuestos (Módulo 2 de la spec)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeeSchedulesModule } from '../fee-schedules/fee-schedules.module';
import { ProceduresModule } from '../procedures/procedures.module';
import { TreatmentPlan, TreatmentPlanSchema } from './schemas/treatment-plan.schema';
import { TreatmentPlansController } from './treatment-plans.controller';
import { TreatmentPlansService } from './treatment-plans.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TreatmentPlan.name, schema: TreatmentPlanSchema },
    ]),
    FeeSchedulesModule, // snapshot de precios al cotizar (HU-B1)
    ProceduresModule,   // creación de ProcedureInstance al completar ítems
  ],
  controllers: [TreatmentPlansController],
  providers: [TreatmentPlansService],
  exports: [TreatmentPlansService],
})
export class TreatmentPlansModule {}
