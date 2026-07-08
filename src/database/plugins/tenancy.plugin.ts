// DONE: Paso 2 - plugin de tenancy (patrón shared-schema de la spec)
// Garantiza el aislamiento multi-tenant en TODOS los modelos:
//   1. Añade `tenantId` (required + index) a todo schema que no lo declare.
//   2. Bloquea cualquier query/aggregation que no filtre por tenantId — el error
//      más caro en un SaaS multi-tenant es filtrar datos de otra clínica.
// Escape explícito: pasar la opción { skipTenantGuard: true } en la query
// (solo para operaciones cross-tenant deliberadas, ej. jobs de plataforma).
import { MongooseQueryMiddleware, Schema } from 'mongoose';

const QUERY_HOOKS: MongooseQueryMiddleware[] = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'countDocuments',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
];

interface TenantGuardOptions {
  skipTenantGuard?: boolean;
}

export function tenancyPlugin(schema: Schema): void {
  // Subdocumentos heredan el tenant del padre — no llevan tenantId propio:
  //  1) schemas implícitos (arrays de objetos en @Prop) se detectan solos;
  //  2) schemas de subdocumento explícitos se eximen con schema.set('tenancy', false).
  if ((schema as unknown as { $implicitlyCreated?: boolean }).$implicitlyCreated === true) return;
  if ((schema.get('tenancy' as never) as unknown) === false) return;

  if (!schema.path('tenantId')) {
    schema.add({ tenantId: { type: String, required: true, index: true } });
  }

  // Un error lanzado dentro de un pre-hook rechaza la operación (comportamiento
  // documentado de Mongoose); no se usa next() porque su presencia depende de la
  // aridad detectada en runtime.
  schema.pre(QUERY_HOOKS, function () {
    const filter = this.getFilter();
    const opts = this.getOptions() as TenantGuardOptions;
    if (!opts.skipTenantGuard && filter.tenantId === undefined) {
      const op = (this as unknown as { op?: string }).op ?? 'query';
      throw new Error(
        `[tenancy] Query "${op}" sobre "${this.model.modelName}" sin filtro tenantId. ` +
          'Añade { tenantId } al filtro o usa la opción skipTenantGuard si es intencional.',
      );
    }
  });

  schema.pre('aggregate', function () {
    const opts = (this.options ?? {}) as TenantGuardOptions;
    const firstStage = this.pipeline()[0] as
      | { $match?: Record<string, unknown> }
      | undefined;
    if (!opts.skipTenantGuard && firstStage?.$match?.tenantId === undefined) {
      throw new Error(
        '[tenancy] Aggregation sin { $match: { tenantId } } como primera etapa. ' +
          'Añádelo o usa la opción skipTenantGuard si es intencional.',
      );
    }
  });
}
