// DONE: Paso 4 - MongoDB efímero de desarrollo (mongodb-memory-server)
// Uso: node scripts/dev-mongo.mjs  → imprime la URI y queda corriendo (Ctrl+C para parar).
// Útil mientras no haya credenciales del Mongo local o una URI de Atlas en .env.
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({
  instance: { port: 27018, dbName: 'dental-clinic' },
});
console.log(`MongoDB de desarrollo listo: ${mongod.getUri()}dental-clinic`);
console.log('Ctrl+C para detener (los datos son efímeros).');

process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});
