// DONE: Paso 5 - importación masiva de aranceles desde Excel (Módulo 3, HU-A1)
// Patrón "partial success": valida fila a fila, acumula errores SIN abortar la carga,
// y hace upsert por {tenantId, feeScheduleId, code} con bulkWrite.
// TODO: pendiente Fase 2 - archivos grandes: exceljs WorkbookReader (streaming) + worker BullMQ
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Workbook } from 'exceljs';
import { AnyBulkWriteOperation, Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { FeeItem } from './schemas/fee-item.schema';

/** Headers exactos de la plantilla (primera fila) — spec Módulo 3 */
export const TEMPLATE_HEADERS = ['code', 'name', 'category', 'price', 'specialties'] as const;

export interface ImportRowError {
  row: number;
  error: string;
}

export interface ImportResult {
  processed: number;
  upserted: number;
  modified: number;
  errors: ImportRowError[];
}

@Injectable()
export class FeeImportService {
  constructor(
    @InjectModel(FeeItem.name) private readonly itemModel: Model<FeeItem>,
    private readonly audit: AuditService,
  ) {}

  async importFromExcel(
    buffer: Buffer,
    scheduleId: string,
    tenantId: string,
    userId?: string,
  ): Promise<ImportResult> {
    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('El archivo no tiene hojas');

    // CA HU-A1: validar headers (fila 1) antes de procesar
    const headers = TEMPLATE_HEADERS.map((_, i) =>
      String(ws.getRow(1).getCell(i + 1).value ?? '').trim().toLowerCase(),
    );
    const expected = TEMPLATE_HEADERS.join(', ');
    if (headers.join(',') !== TEMPLATE_HEADERS.join(',')) {
      throw new BadRequestException(
        `Headers inválidos. La primera fila debe ser exactamente: ${expected}`,
      );
    }

    const ops: AnyBulkWriteOperation<FeeItem>[] = [];
    const errors: ImportRowError[] = [];
    const feeScheduleId = new Types.ObjectId(scheduleId);

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // header

      const code = String(row.getCell(1).value ?? '').trim();
      const name = String(row.getCell(2).value ?? '').trim();
      const category = String(row.getCell(3).value ?? '').trim();
      const price = Number(row.getCell(4).value);
      const specialties = String(row.getCell(5).value ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      // Validación por fila — acumula y sigue (partial success)
      if (!code) { errors.push({ row: rowNumber, error: 'code vacío' }); return; }
      if (!name) { errors.push({ row: rowNumber, error: 'name vacío' }); return; }
      if (isNaN(price) || price < 0) {
        errors.push({ row: rowNumber, error: `price inválido: "${String(row.getCell(4).value ?? '')}"` });
        return;
      }

      ops.push({
        updateOne: {
          filter: { tenantId, feeScheduleId, code },
          update: {
            $set: { name, category, price, specialties, active: true, tenantId, feeScheduleId },
          },
          upsert: true, // inserta o actualiza por código
        },
      });
    });

    const result = ops.length ? await this.itemModel.bulkWrite(ops) : null;
    const summary: ImportResult = {
      processed: ops.length,
      upserted: result?.upsertedCount ?? 0,
      modified: result?.modifiedCount ?? 0,
      errors,
    };

    this.audit.log({
      tenantId,
      action: 'fee.imported',
      entityType: 'FeeSchedule',
      entityId: scheduleId,
      userId,
      after: { ...summary, errors: summary.errors.length } as unknown as Record<string, unknown>,
    });
    return summary;
  }

  /** CA HU-A1: plantilla de ejemplo descargable con los headers exactos */
  async buildTemplate(): Promise<Buffer> {
    const wb = new Workbook();
    const ws = wb.addWorksheet('Aranceles');
    ws.columns = [
      { header: 'code', key: 'code', width: 12 },
      { header: 'name', key: 'name', width: 36 },
      { header: 'category', key: 'category', width: 18 },
      { header: 'price', key: 'price', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'specialties', key: 'specialties', width: 24 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.addRow({ code: 'D0120', name: 'Examen periódico', category: 'Diagnóstico', price: 25, specialties: 'general' });
    ws.addRow({ code: 'D2330', name: 'Resina 1 superficie anterior', category: 'Restauración', price: 80, specialties: 'general' });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
