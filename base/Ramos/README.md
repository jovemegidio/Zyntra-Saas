# Zyntra Ramos

Servico de verticais por ramo de atuacao.

Rotas publicadas:

- `/ramos/`
- `/centro-espirita/`
- `/adega/`
- `/mercado/`
- `/farmacia/`

Health check:

- `/ramos/api/health`

PM2:

- `ecosystem.ramos.config.js`
- porta `3020`
- processo `zyntra-ramos`

As regras de Nginx ficam em `deploy/nginx-ramos-locations.conf`.
