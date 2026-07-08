// DONE: Paso 9 - Caja diaria / Day Sheet (Módulo 8.2, crítico MVP)
// Resumen del día: cobros por método de pago + producción realizada — el control
// diario que Dentrix recomienda para detectar marcados erróneos a tiempo.
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProcedureInstance } from '../procedures/schemas/procedure-instance.schema';
import { Payment } from '../payments/schemas/payment.schema';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(ProcedureInstance.name)
    private readonly procModel: Model<ProcedureInstance>,
  ) {}

  /** Day Sheet del día indicado (00:00 a 23:59 hora del servidor) */
  async daily(tenantId: string, date: Date) {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    const [byMethod, payments, production] = await Promise.all([
      // Cobros del día agrupados por método
      this.paymentModel.aggregate<{ _id: string; total: number; count: number }>([
        { $match: { tenantId, status: 'active', paidAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Detalle de pagos (para revisión de recepción)
      this.paymentModel
        .find({ tenantId, status: 'active', paidAt: { $gte: from, $lte: to } })
        .sort({ paidAt: 1 })
        .exec(),
      // Producción del día (procedimientos completados, refunds restan)
      this.procModel.aggregate<{ _id: null; total: number; count: number }>([
        { $match: { tenantId, status: 'completed', completedAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$value' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalCollected = byMethod.reduce((s, m) => s + m.total, 0);
    return {
      date: from,
      collections: {
        total: round2(totalCollected),
        byMethod: byMethod.map((m) => ({
          method: m._id,
          total: round2(m.total),
          count: m.count,
        })),
        payments,
      },
      production: {
        total: round2(production[0]?.total ?? 0),
        count: production[0]?.count ?? 0,
      },
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
