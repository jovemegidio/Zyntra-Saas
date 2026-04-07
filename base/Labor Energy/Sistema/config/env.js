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

/**
 * Validates all required and recommended environment variables at startup.
 * In production, missing required vars cause process.exit(1).
 * In development, missing vars generate warnings.
 */
function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // Required in ALL environments
  const required = [
    { key: 'DB_PASSWORD', desc: 'Senha do banco de dados MySQL' },
  ];

  // Required ONLY in production
  const requiredProd = [
    { key: 'JWT_SECRET', desc: 'Segredo para assinatura JWT', minLength: 32 },
    { key: 'PII_ENCRYPTION_KEY', desc: 'Chave de criptografia LGPD para dados PII (CPF, CNPJ, salário)', minLength: 32 },
    { key: 'DB_HOST', desc: 'Host do banco de dados' },
    { key: 'DB_USER', desc: 'Usuário do banco de dados' },
    { key: 'DB_NAME', desc: 'Nome do banco de dados' },
  ];

  // Recommended (warn if missing)
  const recommended = [
    { key: 'METRICS_TOKEN', desc: 'Token para proteger o endpoint /metrics fora do localhost' },
    { key: 'INTERNAL_STATUS_TOKEN', desc: 'Token para acessar /status e /readiness fora da rede privada' },
    { key: 'SMTP_HOST', desc: 'Host SMTP para envio de emails' },
    { key: 'SMTP_USER', desc: 'Usuário SMTP' },
    { key: 'SMTP_PASS', desc: 'Senha SMTP' },
    { key: 'REDIS_URL', desc: 'URL do Redis para cache distribuído e rate limiting' },
    { key: 'CORS_ORIGIN', desc: 'Origem CORS personalizada' },
  ];

  // Validate required vars
  for (const { key, desc, minLength } of required) {
    if (!process.env[key]) {
      errors.push(`${key} — ${desc}`);
    } else if (minLength && process.env[key].length < minLength) {
      errors.push(`${key} deve ter pelo menos ${minLength} caracteres`);
    }
  }

  // Validate production-only vars
  if (isProd) {
    for (const { key, desc, minLength } of requiredProd) {
      if (!process.env[key]) {
        errors.push(`${key} — ${desc}`);
      } else if (minLength && process.env[key].length < minLength) {
        errors.push(`${key} deve ter pelo menos ${minLength} caracteres`);
      }
    }

    // SEC-004: Validate JWT_SECRET entropy — reject weak secrets
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      const uniqueChars = new Set(jwtSecret).size;
      const hasUpper = /[A-Z]/.test(jwtSecret);
      const hasLower = /[a-z]/.test(jwtSecret);
      const hasDigit = /[0-9]/.test(jwtSecret);
      const charCategories = [hasUpper, hasLower, hasDigit].filter(Boolean).length;
      if (uniqueChars < 10) {
        errors.push('JWT_SECRET possui entropia insuficiente — deve conter pelo menos 10 caracteres distintos');
      } else if (charCategories < 2) {
        errors.push('JWT_SECRET possui pouca variedade — deve conter pelo menos 2 categorias (maiúsculas, minúsculas, dígitos)');
      }
    }
  }

  // Check recommended vars
  for (const { key, desc } of recommended) {
    if (!process.env[key]) {
      warnings.push(`${key} — ${desc}`);
    }
  }

  // Validate PORT if set
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('PORT deve ser um número entre 1 e 65535');
    }
  }

  // Validate DB_PORT if set
  if (process.env.DB_PORT) {
    const dbPort = parseInt(process.env.DB_PORT);
    if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
      errors.push('DB_PORT deve ser um número entre 1 e 65535');
    }
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Variáveis de ambiente recomendadas não definidas:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  // Report errors
  if (errors.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias ausentes ou inválidas:');
    errors.forEach(e => console.error(`   - ${e}`));
    if (isProd) {
      console.error('💀 Encerrando processo — corrija as variáveis acima.');
      process.exit(1);
    } else {
      console.warn('🟡 Modo desenvolvimento: continuando apesar de variáveis ausentes.');
    }
  }

  return { errors, warnings };
}

module.exports = { loadEnv, requireEnv, validateEnv };
