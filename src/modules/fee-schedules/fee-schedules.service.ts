// DONE: Paso 5 - service de Aranceles (Módulo 3): CRUD de listas + ítems + aumento % masivo
// Los snapshots de presupuestos existentes NUNCA se tocan desde aquí (HU-A3/HU-B4):
// este módulo solo escribe en fee_schedules / fee_items.
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import {
  CreateFeeItemDto,
  CreateFeeScheduleDto,
  IncreasePricesDto,
  UpdateFeeItemDto,
  UpdateFeeScheduleDto,
} from './dto/fee-schedule.dtos';
import { FeeItem, FeeItemDocument } from './schemas/fee-item.schema';
import { FeeSchedule, FeeScheduleDocument } from './schemas/fee-schedule.schema';

@Injectable()
export class FeeSchedulesService {
  constructor(
    @InjectModel(FeeSchedule.name) private readonly scheduleModel: Model<FeeSchedule>,
    @InjectModel(FeeItem.name) private readonly itemModel: Model<FeeItem>,
    private readonly audit: AuditService,
  ) {}

  // ---------- Listas de precios ----------

  async createSchedule(tenantId: string, dto: CreateFeeScheduleDto): Promise<FeeScheduleDocument> {
    const dup = await this.scheduleModel.findOne({ tenantId, name: dto.name }).exec();
    if (dup) throw new ConflictException(`Ya existe una lista llamada "${dto.name}"`);

    // La primera lista del tenant es default automáticamente (HU-A2)
    const count = await this.scheduleModel.countDocuments({ tenantId }).exec();
    const isDefault = dto.isDefault ?? count === 0;
    if (isDefault) await this.unsetDefault(tenantId);

    return this.scheduleModel.create({ ...dto, isDefault, tenantId });
  }

  async findAllSchedules(tenantId: string): Promise<FeeScheduleDocument[]> {
    return this.scheduleModel.find({ tenantId }).sort({ isDefault: -1, name: 1 }).exec();
  }

  async findSchedule(tenantId: string, id: string): Promise<FeeScheduleDocument> {
    const doc = await this.scheduleModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Lista de precios ${id} no encontrada`);
    return doc;
  }

  async updateSchedule(
    tenantId: string,
    id: string,
    dto: UpdateFeeScheduleDto,
  ): Promise<FeeScheduleDocument> {
    if (dto.isDefault === true) await this.unsetDefault(tenantId);
    const updated = await this.scheduleModel
      .findOneAndUpdate({ tenantId, _id: id }, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Lista de precios ${id} no encontrada`);
    return updated;
  }

  /** Lista default del tenant (HU-A2) — usada por Presupuestos para autocompletar precios */
  async findDefaultSchedule(tenantId: string): Promise<FeeScheduleDocument | null> {
    return this.scheduleModel.findOne({ tenantId, isDefault: true }).exec();
  }

  // ---------- Ítems ----------

  /** Lookup individual (usado por Presupuestos para snapshotear precio — HU-B1) */
  async findItem(tenantId: string, itemId: string): Promise<FeeItemDocument> {
    const item = await this.itemModel.findOne({ tenantId, _id: itemId }).exec();
    if (!item) throw new NotFoundException(`Ítem de arancel ${itemId} no encontrado`);
    return item;
  }

  async findItems(tenantId: string, scheduleId: string, search?: string): Promise<FeeItemDocument[]> {
    await this.findSchedule(tenantId, scheduleId); // 404 si no existe
    const filter: Record<string, unknown> = {
      tenantId,
      feeScheduleId: new Types.ObjectId(scheduleId),
    };
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ code: rx }, { name: rx }, { category: rx }];
    }
    return this.itemModel.find(filter).sort({ category: 1, code: 1 }).exec();
  }

  async createItem(
    tenantId: string,
    scheduleId: string,
    dto: CreateFeeItemDto,
  ): Promise<FeeItemDocument> {
    await this.findSchedule(tenantId, scheduleId);
    const dup = await this.itemModel
      .findOne({ tenantId, feeScheduleId: new Types.ObjectId(scheduleId), code: dto.code })
      .exec();
    if (dup) {
      throw new ConflictException(`El código ${dto.code} ya existe en esta lista`);
    }
    return this.itemModel.create({
      ...dto,
      tenantId,
      feeScheduleId: new Types.ObjectId(scheduleId),
    });
  }

  async updateItem(
    tenantId: string,
    itemId: string,
    dto: UpdateFeeItemDto,
    userId?: string,
  ): Promise<FeeItemDocument> {
    const item = await this.itemModel.findOne({ tenantId, _id: itemId }).exec();
    if (!item) throw new NotFoundException(`Ítem ${itemId} no encontrado`);

    const before = { price: item.price, name: item.name, active: item.active };
    Object.assign(item, dto);
    await item.save();

    // Cambio de precio = operación sensible → audit log (Módulo 8.3)
    if (dto.price !== undefined && dto.price !== before.price) {
      this.audit.log({
        tenantId,
        action: 'fee.price_updated',
        entityType: FeeItem.name,
        entityId: itemId,
        userId,
        before: { price: before.price },
        after: { price: dto.price },
      });
    }
    return item;
  }

  // ---------- Aumento porcentual masivo (HU-A3) ----------

  async increasePrices(
    tenantId: string,
    scheduleId: string,
    dto: IncreasePricesDto,
    userId?: string,
  ): Promise<{ affected: number; applied: boolean; percent: number }> {
    await this.findSchedule(tenantId, scheduleId);
    const filter = {
      tenantId,
      feeScheduleId: new Types.ObjectId(scheduleId),
      active: true,
    };
    const affected = await this.itemModel.countDocuments(filter).exec();

    // Sin confirm=true solo devuelve el preview (CA: "confirmación previa")
    if (!dto.confirm) return { affected, applied: false, percent: dto.percent };

    const factor = 1 + dto.percent / 100;
    // Pipeline update: multiplica y redondea a 2 decimales en una sola operación
    // (Mongoose 9 exige updatePipeline:true para pasar un pipeline como update)
    await this.itemModel
      .updateMany(
        filter,
        [{ $set: { price: { $round: [{ $multiply: ['$price', factor] }, 2] } } }],
        { updatePipeline: true },
      )
      .exec();

    this.audit.log({
      tenantId,
      action: 'fee.bulk_increase',
      entityType: FeeSchedule.name,
      entityId: scheduleId,
      userId,
      after: { percent: dto.percent, affected },
    });
    return { affected, applied: true, percent: dto.percent };
  }

  private async unsetDefault(tenantId: string): Promise<void> {
    await this.scheduleModel
      .updateMany({ tenantId, isDefault: true }, { $set: { isDefault: false } })
      .exec();
  }
}
