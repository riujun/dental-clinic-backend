// DONE: Paso 10 - service de Usuarios: el admin de la clínica agrega a su equipo
// (si el rol es doctor, crea también su Professional vinculado — requerimiento
// de onboarding, ver docs/auth-multitenancy.md)
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import { User, UserDocument } from './schemas/user.schema';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly professionals: ProfessionalsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateUserDto,
    createdByUserId?: string,
  ): Promise<UserDocument> {
    const email = dto.email.toLowerCase().trim();
    const dup = await this.userModel.findOne({ tenantId, email }).exec();
    if (dup) throw new ConflictException(`Ya existe un usuario con email ${email}`);

    // Rol doctor → crear su perfil clínico vinculado (Módulo 4)
    let professionalId: Types.ObjectId | undefined;
    if (dto.role === 'doctor') {
      const professional = await this.professionals.create(tenantId, {
        fullName: dto.fullName,
        licenseNumber: dto.professional?.licenseNumber,
        specialties: dto.professional?.specialties,
        commissionRate: dto.professional?.commissionRate,
      });
      professionalId = professional._id as Types.ObjectId;
    }

    const user = await this.userModel.create({
      tenantId,
      email,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      fullName: dto.fullName,
      role: dto.role,
      professionalId,
    });

    this.audit.log({
      tenantId,
      action: 'user.created',
      entityType: User.name,
      entityId: user.id as string,
      userId: createdByUserId,
      after: { email, role: dto.role, professionalId: professionalId?.toString() },
    });
    return user;
  }

  async findAll(tenantId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ tenantId })
      .select('-passwordHash')
      .sort({ fullName: 1 })
      .exec();
  }

  async findByEmail(tenantId: string, email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ tenantId, email: email.toLowerCase().trim() })
      .exec();
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
    updatedByUserId?: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({ tenantId, _id: id }).exec();
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await user.save();

    this.audit.log({
      tenantId,
      action: 'user.updated',
      entityType: User.name,
      entityId: id,
      userId: updatedByUserId,
      after: { active: user.active, passwordChanged: !!dto.password },
    });
    return user;
  }

  /** Crea un usuario directo (usado por Tenants para el admin inicial y el seed) */
  async createRaw(data: {
    tenantId: string;
    email: string;
    password: string;
    fullName: string;
    role: User['role'];
  }): Promise<UserDocument> {
    return this.userModel.create({
      tenantId: data.tenantId,
      email: data.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      fullName: data.fullName,
      role: data.role,
    });
  }

  async existsRole(tenantId: string, role: User['role']): Promise<boolean> {
    return (await this.userModel.countDocuments({ tenantId, role }).exec()) > 0;
  }

  async verifyPassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
