// DONE: Paso 2 - conexión a MongoDB (Mongoose) con plugin de tenancy aplicado a nivel conexión
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { tenancyPlugin } from './plugins/tenancy.plugin';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        // El plugin se registra en la conexión ANTES de compilar los modelos de los
        // módulos de dominio, así ningún schema puede olvidarse del tenantId.
        connectionFactory: (connection: Connection) => {
          connection.plugin(tenancyPlugin);
          return connection;
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
