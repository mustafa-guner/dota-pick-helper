export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'llama3.1',
  openDotaBaseUrl: process.env.OPENDOTA_BASE_URL ?? 'https://api.opendota.com/api',
  dota2DatafeedBaseUrl: process.env.DOTA2_DATAFEED_BASE_URL ?? 'https://www.dota2.com/datafeed',
  patchRefreshCron: process.env.PATCH_REFRESH_CRON ?? '0 */6 * * *',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminTokenSecret: process.env.ADMIN_TOKEN_SECRET,
});
