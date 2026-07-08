// DONE: Paso 7 - módulo Profesionales (Módulo 4 de la spec)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { Professional, ProfessionalSchema } from './schemas/professional.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Professional.name, schema: ProfessionalSchema },
    ]),
  ],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
  // Procedures lo usa para el snapshot de comisión; Commissions (paso 8) también
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
