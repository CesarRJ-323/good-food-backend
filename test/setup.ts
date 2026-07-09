// Setup global de tests: usa una DB de test aislada para no pisar
// la DB de producción/demo (goodfood.db). Se sobreescribe DATABASE_URL
// ANTES de que PrismaService importe el cliente.
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-for-prod';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-prod';
