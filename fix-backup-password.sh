#!/bin/bash
# Fix the hardcoded password in backup-mysql.sh to read from .env
sed -i 's|^DB_PASS=.*|DB_PASS=$(grep -oP "DB_PASSWORD=\\K.*" /var/www/aluforce/.env)|' /var/www/aluforce/scripts/backup-mysql.sh
echo "Fixed. New line:"
grep "DB_PASS" /var/www/aluforce/scripts/backup-mysql.sh | head -1
echo "Testing backup..."
/var/www/aluforce/scripts/backup-mysql.sh 2>&1 | tail -5
