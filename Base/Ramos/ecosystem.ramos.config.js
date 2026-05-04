module.exports = {
  apps: [{
    name: 'zyntra-ramos',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3020,
      BRAND: 'zyntra',
      SECTOR: 'ramos'
    },
    error_file: './logs/ramos-err.log',
    out_file: './logs/ramos-out.log',
    log_file: './logs/ramos-combined.log',
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
