const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath });
  }
}

function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

function validateEnv() {
  const required = ['JWT_SECRET'];
  const warnings = [];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`[ENV] ❌ Variáveis obrigatórias faltando: ${missing.join(', ')}`);
  }
  if (!process.env.REFRESH_SECRET) {
    warnings.push('REFRESH_SECRET não configurado (usando derivação)');
  }
  if (!process.env.DB_HOST) {
    warnings.push('DB_HOST não configurado (usando localhost)');
  }
  if (warnings.length) {
    console.warn(`[ENV] ⚠️  ${warnings.join('; ')}`);
  }
  console.log('[ENV] ✅ Validação de ambiente concluída');
}

module.exports = { loadEnv, requireEnv, validateEnv };
