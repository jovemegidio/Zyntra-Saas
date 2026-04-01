module.exports = {
    apps: [
        {
            name: 'aluforce',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        },
        {
            name: 'whatsapp-bot',
            script: 'whatsapp-service.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '400M',
            max_restarts: 15,
            min_uptime: '30s',
            restart_delay: 5000,
            exp_backoff_restart_delay: 2000,
            kill_timeout: 12000,
            wait_ready: true,
            listen_timeout: 60000,
            error_file: './logs/whatsapp-err.log',
            out_file: './logs/whatsapp-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            env: {
                NODE_ENV: 'production',
                PORT: 3002
            }
        }
    ]
};
