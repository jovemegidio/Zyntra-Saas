#!/bin/bash
# Grant MySQL permissions for n8n database via skip-grant-tables

echo "=== Stopping MySQL ==="
systemctl stop mysql
sleep 3

echo "=== Starting mysqld with skip-grant-tables ==="
mysqld --skip-grant-tables --skip-networking --user=mysql &
MYSQL_PID=$!
sleep 8

echo "=== Granting permissions ==="
mysql << 'SQL'
FLUSH PRIVILEGES;
GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'localhost';
GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'%';
FLUSH PRIVILEGES;
SELECT 'GRANTS_OK' AS result;
SQL

echo "=== Stopping mysqld (skip-grant) ==="
kill $MYSQL_PID 2>/dev/null
wait $MYSQL_PID 2>/dev/null
sleep 3

echo "=== Restarting MySQL normally ==="
systemctl start mysql
sleep 5

echo "=== Testing aluforce access to n8n DB ==="
mysql -u aluforce -pAluforce2026VpsDB n8n -e "SELECT 'N8N_ACCESS_OK' AS status" 2>&1

echo "=== Restarting n8n container ==="
cd /var/www/aluforce
docker restart aluforce-n8n 2>&1
sleep 20

echo "=== Health check ==="
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5678/healthz)
echo "n8n health: HTTP $HTTP"

echo "=== DONE ==="
