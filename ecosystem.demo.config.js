// ecosystem.demo.config.js - PM2 config para Zyntra Demo
// Roda o MESMO server.js mas com banco zyntra_demo e branding Zyntra

module.exports = {
  apps: [{
    name: 'zyntra-demo',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3003,
      // ===== BRANDING =====
      BRAND: 'zyntra',
      DEMO_MODE: 'true',
      // ===== DATABASE =====
      DB_NAME: 'aluforce_vendas',
      DB_HOST: 'localhost',
      DB_USER: 'aluforce',
      DB_PASSWORD: 'CHANGE_ME_DB_PASSWORD',
      DB_CONN_LIMIT: '20',
      DB_QUERY_TIMEOUT: '15000',
      // ===== AUTH =====
      JWT_SECRET: 'CHANGE_ME_JWT_SECRET',
      SKIP_2FA: 'true',
      // ===== SKIP FEATURES =====
      SKIP_MIGRATIONS: '0',           // Rodar migrations para criar tabelas faltantes
      SKIP_WHATSAPP: 'true',         // Não conectar WhatsApp
      SKIP_N8N: 'true',              // Não conectar n8n
      SKIP_EMAIL: 'true',            // Não enviar emails
      SKIP_CRON: 'true',             // Não rodar cron jobs
      // ===== GENERAL =====
      REQUEST_TIMEOUT: '30000',
      REDIS_URL: ''                  // Sem Redis no demo
    },
    error_file: './logs/zyntra-demo-err.log',
    out_file: './logs/zyntra-demo-out.log',
    log_file: './logs/zyntra-demo-combined.log',
    time: true,
    watch: false,
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=1024',
    kill_timeout: 5000,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
