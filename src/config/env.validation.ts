// DONE: Paso 2 - validación de variables de entorno con Joi (falla al arrancar si falta algo)
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),
  MONGODB_URI: Joi.string().required().description('Cadena de conexión MongoDB (local o Atlas)'),
  // DONE: Paso 10 - obligatorio: firma los JWT de login
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  // Seed del primer super_admin (solo se usa si no existe ninguno)
  SUPER_ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).optional(),
  SUPER_ADMIN_PASSWORD: Joi.string().min(8).optional(),
});
