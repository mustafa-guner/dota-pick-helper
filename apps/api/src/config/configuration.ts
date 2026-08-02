export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
  openDotaBaseUrl: process.env.OPENDOTA_BASE_URL ?? 'https://api.opendota.com/api',
  dota2DatafeedBaseUrl: process.env.DOTA2_DATAFEED_BASE_URL ?? 'https://www.dota2.com/datafeed',
  patchRefreshCron: process.env.PATCH_REFRESH_CRON ?? '0 */6 * * *',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
});
