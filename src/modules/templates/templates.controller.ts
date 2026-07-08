// DONE: Comunicaciones Etapa A - endpoints de plantillas
// GET: todas (defaults + personalizadas) · PUT: personalizar (solo admin)
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IsString, MinLength } from 'class-validator';
import { Model } from 'mongoose';
import { Roles } from '../../common/decorators/auth.decorators';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  DEFAULT_TEMPLATES,
  MessageTemplate,
  TEMPLATE_KEYS,
  TemplateKey,
} from './schemas/message-template.schema';

class UpdateTemplateDto {
  @IsString() @MinLength(10) body: string;
}

@Controller('templates')
export class TemplatesController {
  constructor(
    @InjectModel(MessageTemplate.name)
    private readonly templateModel: Model<MessageTemplate>,
  ) {}

  /** Todas las plantillas: default de fábrica u override de la clínica */
  @Get()
  async findAll(@TenantId() tenantId: string) {
    const overrides = await this.templateModel.find({ tenantId }).exec();
    return TEMPLATE_KEYS.map((key) => ({
      key,
      name: DEFAULT_TEMPLATES[key].name,
      body: overrides.find((o) => o.key === key)?.body ?? DEFAULT_TEMPLATES[key].body,
      isCustom: overrides.some((o) => o.key === key),
    }));
  }

  /** Personalizar una plantilla (upsert) — solo admin */
  @Put(':key')
  @Roles('admin')
  async update(
    @TenantId() tenantId: string,
    @Param('key') key: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    if (!TEMPLATE_KEYS.includes(key as TemplateKey)) {
      throw new BadRequestException(`Plantilla desconocida: ${key}`);
    }
    const templateKey = key as TemplateKey;
    return this.templateModel
      .findOneAndUpdate(
        { tenantId, key: templateKey },
        { $set: { body: dto.body, tenantId, key: templateKey } },
        { new: true, upsert: true },
      )
      .exec();
  }
}
