// DONE: Paso 4 - módulo Pacientes (Módulo 1 de la spec)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient, PatientSchema } from './schemas/patient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  // Presupuestos, procedimientos y pagos referencian pacientes (pasos 6-9)
  exports: [PatientsService],
})
export class PatientsModule {}
