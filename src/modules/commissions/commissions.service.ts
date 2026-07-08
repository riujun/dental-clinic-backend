// DONE: Paso 8 - service de Liquidaciones (Módulo 6): aggregation sobre
//       ProcedureInstance (fuente única), cierre de periodos draft→closed→paid
// Criterio: comisión sobre PRODUCCIÓN (completedAt en el periodo), como pide la spec.
// TODO: pendiente Fase 2 - criterio comisión-sobre-cobranza (requiere módulo Pagos)
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import {
  ProcedureInstance,
} from '../procedures/schemas/procedure-instance.schema';
import { ProfessionalsService } from '../professionals/professionals.service';
import { ReportsService } from '../reports/reports.service';
import { CreateSettlementDto, QuerySettlementsDto } from './dto/commission.dtos';
import {
  CommissionSettlement,
  CommissionSettlementDocument,
} from './schemas/commission-settlement.schema';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectModel(CommissionSettlement.name)
    private readonly settlementModel: Model<CommissionSettlement>,
    @InjectModel(ProcedureInstance.name)
    private readonly procModel: Model<ProcedureInstance>,
    private readonly professionals: ProfessionalsService,
    private readonly reports: ReportsService,
    private readonly audit: AuditService,
  ) {}

  /** HU-C2: genera la liquidación (draft) de un doctor por periodo */
  async settle(
    tenantId: string,
    dto: CreateSettlementDto,
    userId?: string,
  ): Promise<CommissionSettlementDocument> {
    await this.professionals.findOne(tenantId, dto.providerId); // 404 si no existe

    // Aggregation de la spec: producción + comisión + lista de procedimientos.
    // Incluye refunds (valores negativos) → producción NETA (HU-C3).
    const [agg] = await this.procModel.aggregate<{
      totalProduction: number;
      totalCommission: number;
      procedureIds: Types.ObjectId[];
    }>([
      {
        $match: {
          tenantId,
          performedByProviderId: new Types.ObjectId(dto.providerId),
          status: 'completed',
          completedAt: { $gte: dto.from, $lte: dto.to },
        },
      },
      {
        $group: {
          _id: null,
          totalProduction: { $sum: '$value' },
          totalCommission: { $sum: '$commissionAmount' },
          procedureIds: { $push: '$_id' },
        },
      },
    ]);

    const settlement = await this.settlementModel.create({
      tenantId,
      providerId: new Types.ObjectId(dto.providerId),
      periodFrom: dto.from,
      periodTo: dto.to,
      totalProduction: round2(agg?.totalProduction ?? 0),
      totalCommission: round2(agg?.totalCommission ?? 0),
      procedureIds: agg?.procedureIds ?? [],
      status: 'draft',
    });

    this.audit.log({
      tenantId,
      action: 'commission.settled',
      entityType: CommissionSettlement.name,
      entityId: settlement.id as string,
      userId,
      after: {
        providerId: dto.providerId,
        totalProduction: settlement.totalProduction,
        totalCommission: settlement.totalCommission,
        procedures: settlement.procedureIds.length,
      },
    });
    return settlement;
  }

  async findAll(
    tenantId: string,
    q: QuerySettlementsDto,
  ): Promise<CommissionSettlementDocument[]> {
    const filter: QueryFilter<CommissionSettlement> = { tenantId };
    if (q.providerId) filter.providerId = new Types.ObjectId(q.providerId);
    if (q.status) filter.status = q.status;
    return this.settlementModel.find(filter).sort({ periodFrom: -1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<CommissionSettlementDocument> {
    const doc = await this.settlementModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Liquidación ${id} no encontrada`);
    return doc;
  }

  /** HU-C2: cerrar el periodo — la liquidación queda inmutable */
  async close(tenantId: string, id: string, userId?: string): Promise<CommissionSettlementDocument> {
    return this.transition(tenantId, id, 'draft', 'closed', userId);
  }

  async markPaid(tenantId: string, id: string, userId?: string): Promise<CommissionSettlementDocument> {
    return this.transition(tenantId, id, 'closed', 'paid', userId);
  }

  /** Export Excel de la liquidación: usa la lista CONGELADA de procedimientos */
  async exportXlsx(tenantId: string, id: string): Promise<Buffer> {
    const settlement = await this.findOne(tenantId, id);
    return this.reports.productionXlsxByIds(tenantId, settlement.procedureIds);
  }

  private async transition(
    tenantId: string,
    id: string,
    from: 'draft' | 'closed',
    to: 'closed' | 'paid',
    userId?: string,
  ): Promise<CommissionSettlementDocument> {
    const doc = await this.findOne(tenantId, id);
    if (doc.status !== from) {
      throw new ConflictException(
        `Transición inválida: la liquidación está '${doc.status}', se requiere '${from}'`,
      );
    }
    doc.status = to;
    if (to === 'closed') doc.closedAt = new Date();
    if (to === 'paid') doc.paidAt = new Date();
    await doc.save();

    this.audit.log({
      tenantId,
      action: `commission.${to}`,
      entityType: CommissionSettlement.name,
      entityId: id,
      userId,
      after: { totalCommission: doc.totalCommission },
    });
    return doc;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
