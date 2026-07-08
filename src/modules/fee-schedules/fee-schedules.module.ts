// DONE: Paso 5 - módulo Aranceles (Módulo 3 de la spec)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeeImportService } from './fee-import.service';
import { FeeSchedulesController } from './fee-schedules.controller';
import { FeeSchedulesService } from './fee-schedules.service';
import { FeeItem, FeeItemSchema } from './schemas/fee-item.schema';
import { FeeSchedule, FeeScheduleSchema } from './schemas/fee-schedule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeeSchedule.name, schema: FeeScheduleSchema },
      { name: FeeItem.name, schema: FeeItemSchema },
    ]),
  ],
  controllers: [FeeSchedulesController],
  providers: [FeeSchedulesService, FeeImportService],
  // Presupuestos (paso 6) autocompleta precios desde el FeeSchedule activo (HU-B1)
  exports: [FeeSchedulesService],
})
export class FeeSchedulesModule {}
