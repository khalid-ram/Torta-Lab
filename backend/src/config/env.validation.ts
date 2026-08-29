import * as Joi from 'joi';

const envSchema = Joi.object({
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_PUBLISHABLE_KEY: Joi.string().min(1).required(),
  SUPABASE_SECRET_KEY: Joi.string().min(1).required(),
  FRONTEND_URL: Joi.string().uri().required(),
  PORT: Joi.number().port().default(4000),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>) {
  const { error, value } = envSchema.validate(config, { abortEarly: false });
  if (error) {
    throw new Error(`Invalid environment configuration: ${error.message}`);
  }
  return value as Record<string, unknown>;
}
