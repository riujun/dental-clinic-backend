// DONE: Paso 2 - health check: verifica que la API responde y el estado de la conexión a MongoDB
// DONE: Paso 10 - @Public(): el health check no requiere token (monitoreo/Railway)
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from './common/decorators/auth.decorators';

const MONGO_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      mongo: MONGO_STATES[this.connection.readyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
