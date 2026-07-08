// DONE: Paso 9 - service de Pagos + estado de cuenta (Módulo 8.1)
// Estado de cuenta = cargos (ProcedureInstance completados, refunds restan) menos
// abonos (Payments activos). Contraparte natural del presupuesto/producción.
// TODO: pendiente Fase 2 - comisión-sobre-cobranza usará applications por procedimiento
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { ProcedureInstance } from '../procedures/schemas/procedure-instance.schema';
import {
  CreatePaymentDto,
  QueryPaymentsDto,
  VoidPaymentDto,
} from './dto/payment.dtos';
import { Payment, PaymentDocument } from './schemas/payment.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(ProcedureInstance.name)
    private readonly procModel: Model<ProcedureInstance>,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreatePaymentDto, userId?: string): Promise<PaymentDocument> {
    const applications = dto.applications ?? [];

    // La suma aplicada no puede superar el monto del pago
    const appliedTotal = applications.reduce((s, a) => s + a.amount, 0);
    if (appliedTotal > dto.amount) {
      throw new BadRequestException(
        `La suma aplicada (${appliedTotal}) supera el monto del pago (${dto.amount})`,
      );
    }

    // Cada aplicación: procedimiento completado, del mismo paciente, sin sobre-pago
    for (const app of applications) {
      const proc = await this.procModel
        .findOne({ tenantId, _id: app.procedureId })
        .exec();
      if (!proc) throw new NotFoundException(`Procedimiento ${app.procedureId} no encontrado`);
      if (String(proc.patientId) !== dto.patientId) {
        throw new ConflictException(`El procedimiento ${proc.code} pertenece a otro paciente`);
      }
      if (proc.status !== 'completed' || proc.value <= 0) {
        throw new ConflictException(`Solo procedimientos completados (no ajustes) reciben pagos`);
      }
      const already = await this.appliedToProcedure(tenantId, proc._id as Types.ObjectId);
      if (already + app.amount > proc.value) {
        throw new ConflictException(
          `Sobre-pago en ${proc.code}: aplicados ${already} + ${app.amount} > valor ${proc.value}`,
        );
      }
    }

    const payment = await this.paymentModel.create({
      ...dto,
      tenantId,
      paidAt: dto.paidAt ?? new Date(),
      applications: applications.map((a) => ({
        procedureId: new Types.ObjectId(a.procedureId),
        amount: a.amount,
      })),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    this.audit.log({
      tenantId,
      action: 'payment.created',
      entityType: Payment.name,
      entityId: payment.id as string,
      userId,
      after: { patientId: dto.patientId, amount: dto.amount, method: dto.method },
    });
    return payment;
  }

  async findAll(tenantId: string, q: QueryPaymentsDto): Promise<PaymentDocument[]> {
    const filter: QueryFilter<Payment> = { tenantId };
    if (q.patientId) filter.patientId = new Types.ObjectId(q.patientId);
    if (q.method) filter.method = q.method;
    if (q.from || q.to) {
      filter.paidAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      };
    }
    return this.paymentModel.find(filter).sort({ paidAt: -1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<PaymentDocument> {
    const doc = await this.paymentModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Pago ${id} no encontrado`);
    return doc;
  }

  /** Los pagos no se borran: se ANULAN con motivo (datos contables + audit) */
  async void(tenantId: string, id: string, dto: VoidPaymentDto, userId?: string): Promise<PaymentDocument> {
    const payment = await this.findOne(tenantId, id);
    if (payment.status === 'voided') {
      throw new ConflictException('El pago ya está anulado');
    }
    payment.status = 'voided';
    payment.voidedAt = new Date();
    payment.voidReason = dto.reason;
    await payment.save();

    this.audit.log({
      tenantId,
      action: 'payment.voided',
      entityType: Payment.name,
      entityId: id,
      userId,
      before: { status: 'active' },
      after: { status: 'voided', reason: dto.reason, amount: payment.amount },
    });
    return payment;
  }

  /**
   * Estado de cuenta del paciente (pestaña (e) del perfil 360°, Módulo 8.1):
   * cargos = producción completada (refunds restan) · abonos = pagos activos.
   */
  async accountStatement(tenantId: string, patientId: string) {
    const pid = new Types.ObjectId(patientId);
    const [charges, payments] = await Promise.all([
      this.procModel
        .find({ tenantId, patientId: pid, status: 'completed' })
        .sort({ completedAt: 1 })
        .exec(),
      this.paymentModel
        .find({ tenantId, patientId: pid, status: 'active' })
        .sort({ paidAt: 1 })
        .exec(),
    ]);

    const totalCharges = round2(charges.reduce((s, c) => s + c.value, 0));
    const totalPayments = round2(payments.reduce((s, p) => s + p.amount, 0));
    return {
      patientId,
      totalCharges,
      totalPayments,
      balance: round2(totalCharges - totalPayments), // >0 = el paciente debe
      charges: charges.map((c) => ({
        procedureId: c._id,
        date: c.completedAt,
        code: c.code,
        description: c.description,
        value: c.value,
        isRefund: c.value < 0,
      })),
      payments: payments.map((p) => ({
        paymentId: p._id,
        date: p.paidAt,
        method: p.method,
        amount: p.amount,
        applications: p.applications,
      })),
    };
  }

  /** Total ya aplicado a un procedimiento por pagos ACTIVOS */
  private async appliedToProcedure(tenantId: string, procedureId: Types.ObjectId): Promise<number> {
    const [agg] = await this.paymentModel.aggregate<{ total: number }>([
      { $match: { tenantId, status: 'active', 'applications.procedureId': procedureId } },
      { $unwind: '$applications' },
      { $match: { 'applications.procedureId': procedureId } },
      { $group: { _id: null, total: { $sum: '$applications.amount' } } },
    ]);
    return agg?.total ?? 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
