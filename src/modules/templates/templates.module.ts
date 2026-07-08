// DONE: Comunicaciones Etapa A - módulo de plantillas de mensajes
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MessageTemplate,
  MessageTemplateSchema,
} from './schemas/message-template.schema';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageTemplate.name, schema: MessageTemplateSchema },
    ]),
  ],
  controllers: [TemplatesController],
})
export class TemplatesModule {}
