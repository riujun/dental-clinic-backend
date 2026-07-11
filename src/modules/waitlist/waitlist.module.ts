// DONE: Idea #8 - módulo de Lista de espera conectada a cancelaciones
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { WaitlistEntry, WaitlistEntrySchema } from './schemas/waitlist-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WaitlistEntry.name, schema: WaitlistEntrySchema },
    ]),
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
