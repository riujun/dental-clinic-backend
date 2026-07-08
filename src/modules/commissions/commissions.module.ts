// DONE: Paso 8 - módulo Comisiones/Liquidación (Módulo 6 de la spec)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProcedureInstance,
  ProcedureInstanceSchema,
} from '../procedures/schemas/procedure-instance.schema';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { ReportsModule } from '../reports/reports.module';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import {
  CommissionSettlement,
  CommissionSettlementSchema,
} from './schemas/commission-settlement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommissionSettlement.name, schema: CommissionSettlementSchema },
      { name: ProcedureInstance.name, schema: ProcedureInstanceSchema },
    ]),
    ProfessionalsModule,
    ReportsModule,
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
})
export class CommissionsModule {}
