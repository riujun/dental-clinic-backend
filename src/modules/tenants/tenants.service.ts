// DONE: Paso 10 - service de Tenants: el super_admin crea la clínica, le asigna su
// subdominio y se genera el usuario admin con contraseña temporal (una sola vez)
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { PLATFORM_TENANT } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { CreateTenantDto } from './dto/tenant.dtos';
import { Tenant, TenantDocument } from './schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  /** Onboarding completo: tenant + subdominio + admin inicial (ver docs/auth-multitenancy.md) */
  async create(dto: CreateTenantDto, createdByUserId?: string) {
    const subdomain = dto.subdomain.toLowerCase().trim();
    const dup = await this.tenantModel
      .findOne({ subdomain }, null, { skipTenantGuard: true })
      .exec();
    if (dup) throw new ConflictException(`El subdominio "${subdomain}" ya está en uso`);

    const tenant = await this.tenantModel.create({
      name: dto.name,
      subdomain,
      contactEmail: dto.adminEmail,
    });

    // Contraseña temporal: se devuelve UNA sola vez (entregar al cliente con su dominio)
    const tempPassword = dto.adminPassword ?? randomBytes(9).toString('base64url');
    const admin = await this.users.createRaw({
      tenantId: tenant.id as string,
      email: dto.adminEmail,
      password: tempPassword,
      fullName: dto.adminFullName,
      role: 'admin',
    });

    this.audit.log({
      tenantId: PLATFORM_TENANT,
      action: 'tenant.created',
      entityType: Tenant.name,
      entityId: tenant.id as string,
      userId: createdByUserId,
      after: { name: dto.name, subdomain, adminEmail: dto.adminEmail },
    });

    return {
      tenant,
      admin: { id: admin.id as string, email: admin.email },
      loginUrl: `https://${subdomain}.tuapp.com`, // TODO: dominio real al deployar
      temporaryPassword: dto.adminPassword ? undefined : tempPassword,
    };
  }

  async findAll(): Promise<TenantDocument[]> {
    return this.tenantModel
      .find({}, null, { skipTenantGuard: true })
      .sort({ name: 1 })
      .exec();
  }

  async findBySubdomain(subdomain: string): Promise<TenantDocument | null> {
    return this.tenantModel
      .findOne({ subdomain: subdomain.toLowerCase().trim() }, null, { skipTenantGuard: true })
      .exec();
  }

  async setStatus(id: string, status: 'active' | 'suspended', userId?: string) {
    const tenant = await this.tenantModel
      .findOneAndUpdate({ _id: id }, { $set: { status } }, { new: true, skipTenantGuard: true })
      .exec();
    if (!tenant) throw new NotFoundException(`Tenant ${id} no encontrado`);
    this.audit.log({
      tenantId: PLATFORM_TENANT,
      action: `tenant.${status}`,
      entityType: Tenant.name,
      entityId: id,
      userId,
    });
    return tenant;
  }
}
