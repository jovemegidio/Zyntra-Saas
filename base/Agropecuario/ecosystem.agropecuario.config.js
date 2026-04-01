// ecosystem.agropecuario.config.js - PM2 config para versão Agropecuário
// Foco: Estoque/Insumos, Financeiro, NFe/NFS-e, Compras, Logística

module.exports = {
  apps: [{
    name: 'zyntra-agropecuario',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3013,
      // ===== BRANDING =====
      BRAND: 'zyntra',
      SECTOR: 'agropecuario',
      // ===== DATABASE =====
      DB_NAME: 'zyntra_agropecuario',
      DB_HOST: 'localhost',
      DB_USER: 'aluforce',
      DB_PASSWORD: 'ALTERE_ESTA_SENHA',
      DB_CONN_LIMIT: '30',
      DB_QUERY_TIMEOUT: '15000',
      // ===== AUTH =====
      JWT_SECRET: 'GERE_UMA_CHAVE_SEGURA_COM_64_CHARS',
      // ===== CLOUDFLARE =====
      CLOUDFLARE_ENABLED: 'true',
      CF_DOMAIN: '',
      // ===== GENERAL =====
      REQUEST_TIMEOUT: '30000',
      REDIS_URL: ''
    },
    error_file: './logs/agropecuario-err.log',
    out_file: './logs/agropecuario-out.log',
    log_file: './logs/agropecuario-combined.log',
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
