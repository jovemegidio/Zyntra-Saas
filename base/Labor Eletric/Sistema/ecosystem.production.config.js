module.exports = {
  apps: [
    {
      name: 'labor-eletric-production',
      script: 'server.js',
      instances: 4, // Cluster mode - aumentado para 4 instâncias
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=2048', // 2GB de memória por instância
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_NAME: 'labor-eletric_vendas',
        DB_USER: 'root',
        BACKUP_DIR: './backups',
        LOGS_DIR: './logs',
        TEMP_DIR: './temp_excel',
        EXCEL_TEMPLATE_DIR: './modules/PCP',
        UV_THREADPOOL_SIZE: 16 // Mais threads para operações async
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_NAME: 'labor-eletric_vendas',
        DB_USER: 'labor-eletric',
        BACKUP_DIR: '/var/backups/labor-eletric',
        LOGS_DIR: '/var/log/labor-eletric',
        TEMP_DIR: '/tmp/labor-eletric_excel',
        EXCEL_TEMPLATE_DIR: '/opt/labor-eletric/templates',
        UV_THREADPOOL_SIZE: 16
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1500M', // Reinicia se passar de 1.5GB
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'temp_excel', 'backups'],
      kill_timeout: 5000, // Graceful shutdown
      wait_ready: true,
      listen_timeout: 10000,
      
      // Configurações de monitoramento
      monitoring: {
        enabled: true,
        http: true,
        https: false,
        port: 3001
      },
      
      // Scripts de inicialização
      pre_deploy: 'npm install --production',
      post_deploy: 'node scripts/setup-production.js',
      
      // Configurações de saúde
      health_check_grace_period: 3000,
      health_check_url: 'http://localhost:3000/health',
      
      // Variáveis específicas da aplicação
      kill_timeout: 5000,
      listen_timeout: 10000,
      
      // Configurações de log avançadas
      merge_logs: true,
      combine_logs: true,
      
      // Configurações de cluster
      kill_retry_time: 100,
      window_size: 1000,
      packet_size: 1000
    }
  ],
  
  // Configurações de deploy
  deploy: {
    production: {
      user: 'labor-eletric',
      host: 'servidor-producao.com',
      ref: 'origin/main',
      repo: 'git@github.com:empresa/labor-eletric-v2.git',
      path: '/opt/labor-eletric',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.production.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'labor-eletric',
      host: 'servidor-staging.com', 
      ref: 'origin/develop',
      repo: 'git@github.com:empresa/labor-eletric-v2.git',
      path: '/opt/labor-eletric-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.production.config.js --env staging'
    }
  }
};