// DONE: Paso 7 - módulo Reports (export Excel de producción, Módulo 5)
// DONE: Idea #5 - dashboard de KPIs del dueño (agrega citas/planes/pagos/pacientes)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import {
  ProcedureInstance,
  ProcedureInstanceSchema,
} from '../procedures/schemas/procedure-instance.schema';
import {
  TreatmentPlan,
  TreatmentPlanSchema,
} from '../treatment-plans/schemas/treatment-plan.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProcedureInstance.name, schema: ProcedureInstanceSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: TreatmentPlan.name, schema: TreatmentPlanSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
