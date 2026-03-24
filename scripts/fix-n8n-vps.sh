#!/bin/bash
# Fix n8n setup on VPS - connects to host MySQL/Redis instead of Docker

echo "=== 1. Fix MySQL permissions for n8n ==="
mysql -e "GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'localhost'; GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'%'; FLUSH PRIVILEGES;" 2>&1
if [ $? -ne 0 ]; then
    echo "Trying with sudo..."
    sudo mysql -e "GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'localhost'; GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'%'; FLUSH PRIVILEGES;" 2>&1
fi

echo ""
echo "=== 2. Verify n8n database ==="
mysql -u aluforce -pAluforce2026VpsDB -e "SHOW DATABASES LIKE 'n8n';" 2>&1

echo ""
echo "=== 3. Create standalone n8n docker-compose ==="
cat > /var/www/aluforce/docker-compose.n8n.yml << 'YAML'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: aluforce-n8n
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      # General
      N8N_HOST: n8n.aluforce.api.br
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      WEBHOOK_URL: https://n8n.aluforce.api.br/
      GENERIC_TIMEZONE: America/Sao_Paulo
      TZ: America/Sao_Paulo
      # Database - connects to HOST MySQL via docker gateway
      DB_TYPE: mysqldb
      DB_MYSQLDB_HOST: 172.17.0.1
      DB_MYSQLDB_PORT: 3306
      DB_MYSQLDB_DATABASE: n8n
      DB_MYSQLDB_USER: aluforce
      DB_MYSQLDB_PASSWORD: Aluforce2026VpsDB
      # Security
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: Aluforce_n8n_2026!
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY:-aluforce-n8n-encryption-key-2026}
      # ALUFORCE API connection
      ALUFORCE_API_URL: http://172.17.0.1:3000
      ALUFORCE_API_KEY: ${N8N_API_KEY:-n8n-internal-key-2026}
      # Email
      N8N_EMAIL_MODE: smtp
      N8N_SMTP_HOST: mail.aluforce.ind.br
      N8N_SMTP_PORT: "465"
      N8N_SMTP_SSL: "true"
      # Executions
      EXECUTIONS_MODE: regular
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - n8n-data:/home/node/.n8n
      - /var/www/aluforce/n8n/workflows:/home/node/.n8n/workflows:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5678/healthz || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

volumes:
  n8n-data:
YAML

echo "Created docker-compose.n8n.yml"

echo ""
echo "=== 4. Ensure MySQL allows Docker connections ==="
# Check if MySQL binds to 0.0.0.0 or 127.0.0.1
BIND=$(grep -r 'bind-address' /etc/mysql/ 2>/dev/null | grep -v '#' | tail -1)
echo "MySQL bind: $BIND"
if echo "$BIND" | grep -q '127.0.0.1'; then
    echo "Need to allow Docker gateway (172.17.0.1) connections"
    # Add Docker gateway to MySQL bind
    sed -i 's/bind-address\s*=\s*127.0.0.1/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf 2>/dev/null
    systemctl restart mysql 2>&1
    echo "MySQL restarted with bind 0.0.0.0"
fi

echo ""
echo "=== 5. Stop old containers and start n8n ==="
docker compose -f /var/www/aluforce/docker-compose.yml down 2>/dev/null
docker stop aluforce-n8n 2>/dev/null
docker rm aluforce-n8n 2>/dev/null

echo "Starting n8n..."
cd /var/www/aluforce
docker compose -f docker-compose.n8n.yml up -d 2>&1

echo ""
echo "=== 6. Wait for n8n (60s) ==="
sleep 60

echo ""
echo "=== 7. Check n8n health ==="
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5678/healthz 2>/dev/null)
echo "Health check: HTTP $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "n8n is RUNNING!"
else
    echo "n8n not ready yet, checking logs..."
    docker logs aluforce-n8n --tail 30 2>&1
fi

echo ""
echo "=== 8. Restart PM2 ==="
cd /var/www/aluforce
PM2_NAME=$(pm2 list 2>/dev/null | grep -oP '\d+\s+\│\s+\K[^\s│]+' | head -1)
echo "PM2 process: $PM2_NAME"
pm2 restart all 2>&1 | head -5

echo ""
echo "=== 9. Final status ==="
echo "Docker:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1
echo ""
echo "Nginx:"
nginx -t 2>&1
echo ""
echo "PM2:"
pm2 list 2>&1 | grep -E 'name|aluforce' | head -5
echo ""
echo "DONE!"
