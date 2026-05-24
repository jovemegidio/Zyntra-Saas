#!/bin/bash
# Fix .env + docker-compose.n8n.yml + add WhatsApp integration

echo "=== 1. Fixing .env variables ==="

# Update N8N vars in .env
cd /var/www/aluforce

: "${N8N_SMTP_USER:?N8N_SMTP_USER required}"
: "${N8N_SMTP_PASS:?N8N_SMTP_PASS required}"
: "${N8N_SMTP_SENDER:?N8N_SMTP_SENDER required}"
: "${N8N_ENCRYPTION_KEY:?N8N_ENCRYPTION_KEY required}"
: "${N8N_API_KEY:?N8N_API_KEY required}"

# Remove old/incorrect N8N vars
sed -i '/^N8N_AUTH_USER=/d' .env
sed -i '/^N8N_AUTH_PASSWORD=/d' .env
sed -i '/^N8N_DB_NAME=/d' .env

# Add missing vars if not present
grep -q 'N8N_SMTP_USER' .env || echo "N8N_SMTP_USER=${N8N_SMTP_USER}" >> .env
grep -q 'N8N_SMTP_PASS' .env || echo "N8N_SMTP_PASS=${N8N_SMTP_PASS}" >> .env
grep -q 'N8N_SMTP_SENDER' .env || echo "N8N_SMTP_SENDER=${N8N_SMTP_SENDER}" >> .env
grep -q 'EMAIL_RELATORIO_DIARIO' .env || echo 'EMAIL_RELATORIO_DIARIO=diretoria@aluforce.ind.br' >> .env
grep -q 'EMAIL_RELATORIOS' .env || echo 'EMAIL_RELATORIOS=diretoria@aluforce.ind.br' >> .env
grep -q 'WHATSAPP_API_URL' .env || echo 'WHATSAPP_API_URL=http://localhost:3002' >> .env
grep -q 'WHATSAPP_ENABLED' .env || echo 'WHATSAPP_ENABLED=true' >> .env

echo "  .env updated:"
grep -E 'N8N_|SMTP_|EMAIL_|WHATSAPP_' .env

echo ""
echo "=== 2. Updating docker-compose.n8n.yml ==="

cat > /var/www/aluforce/docker-compose.n8n.yml << 'COMPOSE'
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: aluforce-n8n
    ports:
      - '127.0.0.1:5678:5678'
    environment:
      # n8n Core
      N8N_HOST: n8n.aluforce.api.br
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      N8N_TRUST_PROXY: 'true'
      WEBHOOK_URL: https://n8n.aluforce.api.br/
      GENERIC_TIMEZONE: America/Sao_Paulo
      TZ: America/Sao_Paulo
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY:?N8N_ENCRYPTION_KEY required}
      EXECUTIONS_MODE: regular

      # ALUFORCE API (interno via Docker bridge)
      ALUFORCE_API_URL: http://172.17.0.1:3000
      ALUFORCE_API_KEY: ${N8N_API_KEY:?N8N_API_KEY required}

      # SMTP para envio de emails pelos workflows
      N8N_EMAIL_MODE: smtp
      N8N_SMTP_HOST: mail.aluforce.ind.br
      N8N_SMTP_PORT: '465'
      N8N_SMTP_SSL: 'true'
      N8N_SMTP_USER: ${N8N_SMTP_USER:?N8N_SMTP_USER required}
      N8N_SMTP_PASS: ${N8N_SMTP_PASS:?N8N_SMTP_PASS required}
      N8N_SMTP_SENDER: ${N8N_SMTP_SENDER:?N8N_SMTP_SENDER required}

      # Destinatários padrão
      EMAIL_RELATORIO_DIARIO: diretoria@aluforce.ind.br
      EMAIL_RELATORIOS: diretoria@aluforce.ind.br
      EMAIL_ALERTAS: diretoria@aluforce.ind.br

      # WhatsApp API (WhatsApp service na porta 3002 do host)
      WHATSAPP_API_URL: http://172.17.0.1:3002
      WHATSAPP_ENABLED: 'true'

    extra_hosts:
      - 'host.docker.internal:host-gateway'
    volumes:
      - n8n-data:/home/node/.n8n
      - /var/www/aluforce/n8n/workflows:/home/node/.n8n/workflows:ro
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://localhost:5678/healthz || exit 1']
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

volumes:
  n8n-data:
COMPOSE

echo "  docker-compose.n8n.yml updated"

echo ""
echo "=== 3. Restarting n8n with new config ==="
cd /var/www/aluforce
docker compose -f docker-compose.n8n.yml down
docker compose -f docker-compose.n8n.yml up -d
sleep 15

echo ""
echo "=== 4. Verifying ==="
docker ps --filter name=aluforce-n8n --format "{{.Status}}"
docker exec aluforce-n8n env | grep -E 'SMTP|EMAIL|WHATSAPP|ALUFORCE' | sort

echo ""
echo "=== Done! ==="
