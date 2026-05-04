#!/bin/bash
# Backup diário automático - Zyntra ERP
BACKUP_DIR=/var/www/aluforce/backups
DB_USER=aluforce
DB_PASS="$(grep DB_PASSWORD /var/www/aluforce/.env | cut -d= -f2)"
DB_NAME=aluforce_vendas
DATE=$(date +%Y%m%d_%H%M%S)

# Criar backup compactado
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" --single-transaction --routines --triggers 2>/dev/null | gzip > "$BACKUP_DIR/backup_${DATE}.sql.gz"

# Verificar se backup foi criado
if [ -s "$BACKUP_DIR/backup_${DATE}.sql.gz" ]; then
    SIZE=$(du -h "$BACKUP_DIR/backup_${DATE}.sql.gz" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: backup_${DATE}.sql.gz ($SIZE)" >> "$BACKUP_DIR/backup.log"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: backup vazio ou falhou" >> "$BACKUP_DIR/backup.log"
    rm -f "$BACKUP_DIR/backup_${DATE}.sql.gz"
fi

# Manter apenas os ultimos 14 dias
find "$BACKUP_DIR" -name 'backup_*.sql.gz' -mtime +14 -delete
