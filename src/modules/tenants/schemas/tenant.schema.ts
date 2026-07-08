// DONE: Paso 10 - schema Tenant (clínica): el super_admin la crea y le asigna su
// subdominio de acceso (ver docs/auth-multitenancy.md)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

export const TENANT_STATUSES = ['active', 'suspended'] as const;

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  // Nota: esta colección es de PLATAFORMA (no lleva tenantId de aislamiento);
  // el plugin le añade el path pero las queries usan skipTenantGuard vía service.
  @Prop({ required: true }) name: string;

  /** Slug único de acceso: <subdomain>.tuapp.com — lo asigna el super_admin */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  subdomain: string;

  @Prop({ type: String, enum: TENANT_STATUSES, default: 'active' })
  status: (typeof TENANT_STATUSES)[number];

  @Prop() contactEmail?: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
// Colección de plataforma: exenta del guard/campo tenantId
TenantSchema.set('tenancy' as never, false as never);
