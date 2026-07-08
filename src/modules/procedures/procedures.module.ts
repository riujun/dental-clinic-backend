// DONE: Paso 3 - módulo Procedures (ProcedureInstance, entidad central de la spec)
// DONE: Paso 7 - importa Professionals para el snapshot de comisión al completar
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';
import {
  ProcedureInstance,
  ProcedureInstanceSchema,
} from './schemas/procedure-instance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProcedureInstance.name, schema: ProcedureInstanceSchema },
    ]),
    ProfessionalsModule,
  ],
  controllers: [ProceduresController],
  providers: [ProceduresService],
  // Los módulos de presupuestos/comisiones/reportes (pasos 6-8) consumirán este service
  exports: [ProceduresService],
})
export class ProceduresModule {}
