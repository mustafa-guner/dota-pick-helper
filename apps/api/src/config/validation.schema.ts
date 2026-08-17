import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  OLLAMA_BASE_URL: Joi.string().default('http://localhost:11434'),
  OLLAMA_MODEL: Joi.string().default('llama3.1'),
  OPENDOTA_BASE_URL: Joi.string().default('https://api.opendota.com/api'),
  DOTA2_DATAFEED_BASE_URL: Joi.string().default('https://www.dota2.com/datafeed'),
  PATCH_REFRESH_CRON: Joi.string().default('0 */6 * * *'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  // Used only to bootstrap the first row in admin_users on an empty table — see
  // admin-auth.service.ts's seedInitialUser(). Not read at login time after that.
  ADMIN_USERNAME: Joi.string().required(),
  ADMIN_PASSWORD: Joi.string().required(),
  ADMIN_TOKEN_SECRET: Joi.string().required(),
});
