// DONE: Paso 7 - reporte de producción con export Excel (Módulo 5, HU-R2)
// Columnas de la spec: Fecha | Paciente | Doctor | Código | Descripción | Diente |
// Valor | % Comisión | Monto Comisión — con fila de totales (fórmula SUM).
// Fuente única: ProcedureInstance (status=completed) — la misma que usará la
// liquidación del paso 8.
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Workbook } from 'exceljs';
import { Model, Types } from 'mongoose';
import { Appointment } from '../appointments/schemas/appointment.schema';
import { Patient } from '../patients/schemas/patient.schema';
import { Payment } from '../payments/schemas/payment.schema';
import {
  ProcedureInstance,
  ProcedureInstanceDocument,
} from '../procedures/schemas/procedure-instance.schema';
import { TreatmentPlan } from '../treatment-plans/schemas/treatment-plan.schema';
import { ProductionQueryDto } from './dto/production-query.dto';

export interface PopulatedProcedure
  extends Omit<ProcedureInstanceDocument, 'patientId' | 'performedByProviderId'> {
  patientId?: { firstName?: string; lastName?: string } | null;
  performedByProviderId?: { fullName?: string } | null;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(ProcedureInstance.name)
    private readonly procModel: Model<ProcedureInstance>,
    @InjectModel(Appointment.name) private readonly apptModel: Model<Appointment>,
    @InjectModel(TreatmentPlan.name) private readonly planModel: Model<TreatmentPlan>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
  ) {}

  /** Idea #5: KPIs del dueño en un solo endpoint (docs/ideas-mejoras.md) */
  async dashboard(tenantId: string, from: Date, to: Date) {
    const range = { $gte: from, $lte: to };

    const [prodTotal] = await this.procModel.aggregate<{
      total: number; commission: number; count: number;
    }>([
      { $match: { tenantId, status: 'completed', completedAt: range } },
      { $group: { _id: null, total: { $sum: '$value' }, commission: { $sum: '$commissionAmount' }, count: { $sum: 1 } } },
    ]);

    const byProvider = await this.procModel.aggregate<{
      _id: Types.ObjectId; name?: string; total: number; commission: number; count: number;
    }>([
      { $match: { tenantId, status: 'completed', completedAt: range } },
      { $group: { _id: '$performedByProviderId', total: { $sum: '$value' }, commission: { $sum: '$commissionAmount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'professionals', localField: '_id', foreignField: '_id', as: 'prof' } },
      { $addFields: { name: { $first: '$prof.fullName' } } },
      { $project: { prof: 0 } },
      { $sort: { total: -1 } },
    ]);

    const productionByDay = await this.procModel.aggregate<{ _id: string; total: number }>([
      { $match: { tenantId, status: 'completed', completedAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, total: { $sum: '$value' } } },
      { $sort: { _id: 1 } },
    ]);

    const topProcedures = await this.procModel.aggregate<{
      _id: { code: string; description: string }; count: number; total: number;
    }>([
      { $match: { tenantId, status: 'completed', completedAt: range, value: { $gt: 0 } } },
      { $group: { _id: { code: '$code', description: '$description' }, count: { $sum: 1 }, total: { $sum: '$value' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);

    const apptRaw = await this.apptModel.aggregate<{ _id: string; n: number }>([
      { $match: { tenantId, startAt: range } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const apptBy = Object.fromEntries(apptRaw.map((a) => [a._id, a.n]));
    const apptTotal = apptRaw.reduce((s, a) => s + a.n, 0);
    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    // Case acceptance (spec Fase 2): aceptados / (aceptados + rechazados).
    // ACCEPTED/IN_PROGRESS/COMPLETED cuentan como aceptados; DRAFT/PRESENTED aún no deciden.
    const planRaw = await this.planModel.aggregate<{ _id: string; n: number }>([
      { $match: { tenantId, createdAt: range } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const planBy = Object.fromEntries(planRaw.map((p) => [p._id, p.n]));
    const accepted = (planBy.ACCEPTED ?? 0) + (planBy.IN_PROGRESS ?? 0) + (planBy.COMPLETED ?? 0);
    const rejected = planBy.REJECTED ?? 0;

    const [payTotal] = await this.paymentModel.aggregate<{ total: number; count: number }>([
      { $match: { tenantId, status: 'active', paidAt: range } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const newPatients = await this.patientModel
      .countDocuments({ tenantId, createdAt: range })
      .exec();

    return {
      from, to,
      production: {
        total: round2(prodTotal?.total ?? 0),
        commission: round2(prodTotal?.commission ?? 0),
        count: prodTotal?.count ?? 0,
        byProvider: byProvider.map((p) => ({
          providerId: p._id, name: p.name ?? '(doctor)',
          total: round2(p.total), commission: round2(p.commission ?? 0), count: p.count,
        })),
        byDay: productionByDay.map((d) => ({ date: d._id, total: round2(d.total) })),
        topProcedures: topProcedures.map((t) => ({
          code: t._id.code, description: t._id.description, count: t.count, total: round2(t.total),
        })),
      },
      collected: { total: round2(payTotal?.total ?? 0), count: payTotal?.count ?? 0 },
      appointments: {
        total: apptTotal,
        completed: apptBy.completed ?? 0,
        cancelled: apptBy.cancelled ?? 0,
        noShow: apptBy.no_show ?? 0,
        pending: (apptBy.scheduled ?? 0) + (apptBy.confirmed ?? 0),
        noShowRate: pct(apptBy.no_show ?? 0, apptTotal),
        cancelRate: pct(apptBy.cancelled ?? 0, apptTotal),
      },
      plans: {
        created: planRaw.reduce((s, p) => s + p.n, 0),
        accepted,
        rejected,
        awaiting: (planBy.DRAFT ?? 0) + (planBy.PRESENTED ?? 0),
        acceptanceRate: pct(accepted, accepted + rejected),
      },
      newPatients,
    };
  }

  /** Idea #9: respaldo COMPLETO del tenant en un Excel de 5 hojas
   *  ("mis datos son míos" — docs/ideas-mejoras.md) */
  async backupXlsx(tenantId: string): Promise<Buffer> {
    const pop = (path: string, select: string) => ({
      path, select, options: { skipTenantGuard: true },
    });
    type NamedRef = { firstName?: string; lastName?: string; fullName?: string } | null;
    const name = (r: NamedRef) =>
      r ? (r.fullName ?? `${r.lastName ?? ''}, ${r.firstName ?? ''}`.replace(/^, /, '')) : '';

    const [patients, procedures, appointments, payments, plans] = await Promise.all([
      this.patientModel.find({ tenantId }).sort({ lastName: 1 }).exec(),
      this.procModel.find({ tenantId }).sort({ completedAt: 1 })
        .populate(pop('patientId', 'firstName lastName'))
        .populate(pop('performedByProviderId', 'fullName')).exec(),
      this.apptModel.find({ tenantId }).sort({ startAt: 1 })
        .populate(pop('patientId', 'firstName lastName'))
        .populate(pop('professionalId', 'fullName')).exec(),
      this.paymentModel.find({ tenantId }).sort({ paidAt: 1 })
        .populate(pop('patientId', 'firstName lastName')).exec(),
      this.planModel.find({ tenantId }).sort({ createdAt: 1 })
        .populate(pop('patientId', 'firstName lastName')).exec(),
    ]);

    const wb = new Workbook();
    const sheet = (title: string, columns: { header: string; key: string; width?: number }[]) => {
      const ws = wb.addWorksheet(title);
      ws.columns = columns.map((c) => ({ ...c, width: c.width ?? 18 }));
      ws.getRow(1).font = { bold: true };
      return ws;
    };

    const wsPat = sheet('Pacientes', [
      { header: 'Apellido', key: 'last' }, { header: 'Nombre', key: 'first' },
      { header: 'Documento', key: 'doc' }, { header: 'Teléfono', key: 'phone' },
      { header: 'Email', key: 'email', width: 26 }, { header: 'Nacimiento', key: 'birth' },
      { header: 'Alergias', key: 'allergies', width: 26 }, { header: 'Estado', key: 'status' },
      { header: 'Creado', key: 'created' },
    ]);
    for (const p of patients) {
      wsPat.addRow({
        last: p.lastName, first: p.firstName, doc: p.documentNumber ?? '',
        phone: p.phone ?? '', email: p.email ?? '',
        birth: p.birthDate ? new Date(p.birthDate).toISOString().slice(0, 10) : '',
        allergies: (p.medicalHistory?.allergies ?? []).map((a) => a.substance).join(', '),
        status: p.status, created: (p as unknown as { createdAt?: Date }).createdAt,
      });
    }

    const wsProc = sheet('Procedimientos', [
      { header: 'Fecha', key: 'date' }, { header: 'Paciente', key: 'patient', width: 26 },
      { header: 'Doctor', key: 'doctor', width: 22 }, { header: 'Código', key: 'code', width: 10 },
      { header: 'Descripción', key: 'desc', width: 30 }, { header: 'Diente', key: 'tooth', width: 8 },
      { header: 'Valor', key: 'value', width: 12 }, { header: '% Com.', key: 'rate', width: 8 },
      { header: 'Comisión', key: 'commission', width: 12 }, { header: 'Estado', key: 'status' },
    ]);
    for (const r of procedures as unknown as PopulatedProcedure[]) {
      wsProc.addRow({
        date: r.completedAt, patient: name(r.patientId as NamedRef),
        doctor: name(r.performedByProviderId as NamedRef), code: r.code, desc: r.description,
        tooth: r.toothFdi ?? '', value: r.value, rate: r.commissionRate,
        commission: r.commissionAmount, status: r.status,
      });
    }

    const wsAppt = sheet('Citas', [
      { header: 'Inicio', key: 'start', width: 20 }, { header: 'Fin', key: 'end', width: 20 },
      { header: 'Paciente', key: 'patient', width: 26 }, { header: 'Doctor', key: 'doctor', width: 22 },
      { header: 'Motivo', key: 'reason', width: 24 }, { header: 'Estado', key: 'status' },
      { header: 'Nota interna', key: 'notes', width: 30 },
    ]);
    for (const a of appointments) {
      wsAppt.addRow({
        start: a.startAt, end: a.endAt,
        patient: name(a.patientId as unknown as NamedRef),
        doctor: name(a.professionalId as unknown as NamedRef),
        reason: a.reason ?? '', status: a.status, notes: a.notes ?? '',
      });
    }

    const wsPay = sheet('Pagos', [
      { header: 'Fecha', key: 'date', width: 20 }, { header: 'Paciente', key: 'patient', width: 26 },
      { header: 'Método', key: 'method' }, { header: 'Monto', key: 'amount', width: 12 },
      { header: 'Estado', key: 'status' }, { header: 'Motivo anulación', key: 'voidReason', width: 24 },
    ]);
    for (const p of payments) {
      wsPay.addRow({
        date: p.paidAt, patient: name(p.patientId as unknown as NamedRef),
        method: p.method, amount: p.amount, status: p.status, voidReason: p.voidReason ?? '',
      });
    }

    const wsPlan = sheet('Presupuestos', [
      { header: 'Fecha', key: 'date', width: 20 }, { header: 'Paciente', key: 'patient', width: 26 },
      { header: 'Título', key: 'title', width: 24 }, { header: 'Estado', key: 'status' },
      { header: 'Ítems', key: 'items', width: 8 }, { header: 'Total', key: 'total', width: 12 },
    ]);
    for (const pl of plans) {
      wsPlan.addRow({
        date: (pl as unknown as { createdAt?: Date }).createdAt,
        patient: name(pl.patientId as unknown as NamedRef),
        title: pl.title ?? '', status: pl.status,
        items: pl.items.length, total: pl.total,
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private async fetchProduction(
    tenantId: string,
    q: ProductionQueryDto,
  ): Promise<PopulatedProcedure[]> {
    const filter: Record<string, unknown> = {
      tenantId,
      status: 'completed',
      completedAt: { $gte: q.from, $lte: q.to },
    };
    if (q.providerId) filter.performedByProviderId = new Types.ObjectId(q.providerId);
    // skipTenantGuard en los populate: los _id provienen de la query padre ya
    // filtrada por tenant, y el guard bloquearía el find interno del populate.
    return this.procModel
      .find(filter)
      .sort({ completedAt: 1 })
      .populate({
        path: 'patientId',
        select: 'firstName lastName',
        options: { skipTenantGuard: true },
      })
      .populate({
        path: 'performedByProviderId',
        select: 'fullName',
        options: { skipTenantGuard: true },
      })
      .exec() as unknown as Promise<PopulatedProcedure[]>;
  }

  /** Versión JSON (para pantallas del frontend) */
  async production(tenantId: string, q: ProductionQueryDto) {
    const rows = await this.fetchProduction(tenantId, q);
    const totalProduction = rows.reduce((s, r) => s + (r.value ?? 0), 0);
    const totalCommission = rows.reduce((s, r) => s + (r.commissionAmount ?? 0), 0);
    return {
      from: q.from,
      to: q.to,
      count: rows.length,
      totalProduction: Math.round(totalProduction * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      rows,
    };
  }

  /** Export .xlsx estructurado para liquidaciones (HU-R2) */
  async productionXlsx(tenantId: string, q: ProductionQueryDto): Promise<Buffer> {
    const rows = await this.fetchProduction(tenantId, q);
    return this.buildProductionWorkbook(rows);
  }

  /** Export .xlsx de una liquidación CERRADA: usa la lista congelada de
   *  procedureIds del settlement, no el rango de fechas (Paso 8, Módulo 6) */
  async productionXlsxByIds(tenantId: string, ids: Types.ObjectId[]): Promise<Buffer> {
    const rows = (await this.procModel
      .find({ tenantId, _id: { $in: ids } })
      .sort({ completedAt: 1 })
      .populate({
        path: 'patientId',
        select: 'firstName lastName',
        options: { skipTenantGuard: true },
      })
      .populate({
        path: 'performedByProviderId',
        select: 'fullName',
        options: { skipTenantGuard: true },
      })
      .exec()) as unknown as PopulatedProcedure[];
    return this.buildProductionWorkbook(rows);
  }

  private async buildProductionWorkbook(rows: PopulatedProcedure[]): Promise<Buffer> {
    const wb = new Workbook();
    const ws = wb.addWorksheet('Producción');
    ws.columns = [
      { header: 'Fecha', key: 'date', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Paciente', key: 'patient', width: 28 },
      { header: 'Doctor', key: 'doctor', width: 24 },
      { header: 'Código', key: 'code', width: 12 },
      { header: 'Descripción', key: 'desc', width: 32 },
      { header: 'Diente', key: 'tooth', width: 8 },
      { header: 'Valor', key: 'value', width: 12, style: { numFmt: '#,##0.00' } },
      { header: '% Com.', key: 'rate', width: 8, style: { numFmt: '0%' } },
      { header: 'Comisión', key: 'commission', width: 14, style: { numFmt: '#,##0.00' } },
    ];
    ws.getRow(1).font = { bold: true };

    rows.forEach((r) =>
      ws.addRow({
        date: r.completedAt,
        patient: r.patientId
          ? `${r.patientId.firstName ?? ''} ${r.patientId.lastName ?? ''}`.trim()
          : '(sin paciente)',
        doctor: r.performedByProviderId?.fullName ?? '(sin doctor)',
        code: r.code,
        desc: r.description,
        tooth: r.toothFdi ?? '',
        value: r.value,
        rate: r.commissionRate,
        commission: r.commissionAmount,
      }),
    );

    // Fila de totales con fórmula SUM (CA HU-R2)
    const last = ws.rowCount;
    const totals = ws.addRow({
      desc: 'TOTAL',
      value: last > 1 ? { formula: `SUM(G2:G${last})` } : 0,
      commission: last > 1 ? { formula: `SUM(I2:I${last})` } : 0,
    });
    totals.font = { bold: true };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
