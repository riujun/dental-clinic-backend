// DONE: Paso 5 - schema FeeItem (Módulo 3): un procedimiento con precio dentro de una lista
// El precio de aquí se COPIA (snapshot) al presupuesto al cotizar — cambiarlo después
// jamás toca presupuestos emitidos (Key Finding 2 / HU-B4).
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type FeeItemDocument = HydratedDocument<FeeItem>;

@Schema({ timestamps: true, collection: 'fee_items' })
export class FeeItem {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FeeSchedule', index: true, required: true })
  feeScheduleId: Types.ObjectId;

  @Prop({ required: true, index: true }) code: string; // código de procedimiento (CDT-like o local)
  @Prop({ required: true }) name: string;
  @Prop() category?: string;                            // Diagnóstico, Preventivo, Restauración...
  @Prop({ required: true }) price: number;

  /** Qué especialidades realizan este procedimiento (filtra doctores, Módulo 4) */
  @Prop({ type: [String] }) specialties?: string[];

  @Prop({ default: true }) active: boolean;
}

export const FeeItemSchema = SchemaFactory.createForClass(FeeItem);

// Clave del upsert de la carga masiva por Excel (spec Módulo 3)
FeeItemSchema.index({ tenantId: 1, feeScheduleId: 1, code: 1 }, { unique: true });
