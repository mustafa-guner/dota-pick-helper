import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  ANTHROPIC_MODEL: Joi.string().default('claude-sonnet-5'),
  OPENDOTA_BASE_URL: Joi.string().default('https://api.opendota.com/api'),
  DOTA2_DATAFEED_BASE_URL: Joi.string().default('https://www.dota2.com/datafeed'),
  PATCH_REFRESH_CRON: Joi.string().default('0 */6 * * *'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
});
