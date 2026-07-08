// DONE: Paso 10b - módulo Agenda/Citas (spec base; base de recordatorios Fase 2)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    ProfessionalsModule, // validación de doctor + advertencia de especialidad
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService], // Fase 2: worker de recordatorios
})
export class AppointmentsModule {}
