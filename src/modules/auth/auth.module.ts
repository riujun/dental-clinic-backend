// DONE: Paso 10 - módulo Auth: JWT global (guard en APP_GUARD) + roles RBAC
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global() // JwtService disponible para el guard en toda la app
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // '1d', '12h', etc. — el tipo de @nestjs/jwt exige el StringValue de 'ms'
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '1d') as unknown as number,
        },
      }),
    }),
    UsersModule,
    TenantsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Orden importa: primero autentica (JWT), luego autoriza (roles)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
