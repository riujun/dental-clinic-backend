// DONE: Paso 10 - schema User: login por tenant, 5 roles RBAC
// Email único POR TENANT (el mismo email puede existir en dos clínicas).
// Los super_admin usan tenantId='platform' (no pertenecen a ninguna clínica).
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export const ROLES = ['super_admin', 'admin', 'doctor', 'receptionist', 'assistant'] as const;
export type Role = (typeof ROLES)[number];

/** tenantId reservado para usuarios de plataforma (super_admin) */
export const PLATFORM_TENANT = 'platform';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ index: true, required: true }) tenantId: string;

  @Prop({ required: true, lowercase: true, trim: true }) email: string;

  @Prop({ required: true }) passwordHash: string;

  @Prop({ required: true }) fullName: string;

  @Prop({ type: String, enum: ROLES, required: true }) role: Role;

  @Prop({ default: true }) active: boolean;

  /** Si el usuario es doctor: su perfil clínico (Módulo 4) */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional' })
  professionalId?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Auditoría de seguridad: passwordHash nunca debe salir en una respuesta HTTP,
// sin importar qué método lo devuelva (create/update también, no solo findAll).
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as { passwordHash?: string }).passwordHash;
    return ret;
  },
});
