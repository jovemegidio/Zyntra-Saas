module.exports = {
  apps: [
    {
      name: 'labor-eletric-demo',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: 4001,
        EMPRESA_NOME: 'LABOR ELETRIC INDUSTRIA E COMERCIO UNIPESSOAL LTDA',
        EMPRESA_FANTASIA: 'LABOR ELETRIC',
        EMPRESA_CNPJ: '35.165.246/0001-06'
      },
      max_memory_restart: '300M',
      watch: false,
      autorestart: true,
      merge_logs: true
    }
  ]
};
