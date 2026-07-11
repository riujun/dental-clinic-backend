// DONE: Paso 2 - módulo raíz: config validada + MongoDB + audit transversal
// DONE: Paso 3 - ProceduresModule (ProcedureInstance, entidad central)
// DONE: Paso 4 - PatientsModule (pacientes + anamnesis)
// DONE: Paso 5 - FeeSchedulesModule (aranceles + carga Excel)
// DONE: Paso 6 - TreatmentPlansModule (presupuestos)
// DONE: Paso 7 - ProfessionalsModule + ReportsModule + snapshot de comisión
// DONE: Paso 8 - CommissionsModule (liquidaciones) + refunds
// DONE: Paso 9 - PaymentsModule + CashRegisterModule + consulta de audit
//       → ETAPA 1 (núcleo clínico-comercial) COMPLETA en backend
// DONE: Paso 10 - Auth (JWT global) + Users (equipo por clínica) + Tenants
//       (provisión por super_admin con subdominio) — ver docs/auth-multitenancy.md
// DONE: Paso 10b - AppointmentsModule (agenda/citas, base de recordatorios Fase 2)
// TODO: pendiente - frontend Next.js (paso 11), deploy
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { FeeSchedulesModule } from './modules/fee-schedules/fee-schedules.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TreatmentPlansModule } from './modules/treatment-plans/treatment-plans.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    ProfessionalsModule,
    ProceduresModule,
    PatientsModule,
    FeeSchedulesModule,
    TreatmentPlansModule,
    ReportsModule,
    CommissionsModule,
    PaymentsModule,
    CashRegisterModule,
    AppointmentsModule,
    TemplatesModule,
    WaitlistModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
