#!/bin/bash
# ============================================
# ALUFORCE — Backup Automatizado MySQL
# Executa diariamente via cron
# Retém últimos 7 backups diários + 4 semanais
# ============================================

set -euo pipefail

# ── Configuração ──────────────────────────────
BACKUP_DIR="/var/backups/aluforce/mysql"
DB_USER="aluforce"
DB_PASS="Aluforce2026VpsDB"
DB_HOST="127.0.0.1"
DATABASES="aluforce_vendas zyntra_demo"
RETENTION_DAILY=7    # manter últimos 7 backups diários
RETENTION_WEEKLY=4   # manter últimos 4 backups semanais (domingos)
LOG_FILE="/var/log/aluforce/backup-mysql.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=segunda, 7=domingo

# ── Funções auxiliares ────────────────────────
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ── Criar diretórios ─────────────────────────
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$(dirname "$LOG_FILE")"

log "=== BACKUP MySQL INICIADO ==="

TOTAL_SIZE=0
ERRORS=0

for DB in $DATABASES; do
    DUMP_FILE="$BACKUP_DIR/daily/${DB}_${TIMESTAMP}.sql.gz"
    
    log "  Exportando $DB..."
    
    if mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-table \
        --no-tablespaces \
        --set-gtid-purged=OFF \
        "$DB" 2>>"$LOG_FILE" | gzip > "$DUMP_FILE"; then
        
        SIZE=$(du -h "$DUMP_FILE" | cut -f1)
        log "  ✅ $DB → $DUMP_FILE ($SIZE)"
        
        # Se é domingo, copiar para weekly
        if [ "$DAY_OF_WEEK" -eq 7 ]; then
            WEEKLY_FILE="$BACKUP_DIR/weekly/${DB}_${TIMESTAMP}.sql.gz"
            cp "$DUMP_FILE" "$WEEKLY_FILE"
            log "  📦 Cópia semanal: $WEEKLY_FILE"
        fi
    else
        log "  ❌ ERRO ao exportar $DB"
        ERRORS=$((ERRORS + 1))
        rm -f "$DUMP_FILE"
    fi
done

# ── Limpeza — rotação de backups ──────────────
log "  Limpando backups antigos..."

# Diários: manter últimos N
for DB in $DATABASES; do
    DAILY_COUNT=$(ls -1 "$BACKUP_DIR/daily/${DB}_"*.sql.gz 2>/dev/null | wc -l)
    if [ "$DAILY_COUNT" -gt "$RETENTION_DAILY" ]; then
        REMOVE=$((DAILY_COUNT - RETENTION_DAILY))
        ls -1t "$BACKUP_DIR/daily/${DB}_"*.sql.gz | tail -"$REMOVE" | xargs rm -f
        log "  🧹 Removidos $REMOVE backups diários antigos de $DB"
    fi
done

# Semanais: manter últimos N
for DB in $DATABASES; do
    WEEKLY_COUNT=$(ls -1 "$BACKUP_DIR/weekly/${DB}_"*.sql.gz 2>/dev/null | wc -l)
    if [ "$WEEKLY_COUNT" -gt "$RETENTION_WEEKLY" ]; then
        REMOVE=$((WEEKLY_COUNT - RETENTION_WEEKLY))
        ls -1t "$BACKUP_DIR/weekly/${DB}_"*.sql.gz | tail -"$REMOVE" | xargs rm -f
        log "  🧹 Removidos $REMOVE backups semanais antigos de $DB"
    fi
done

# ── Resumo ────────────────────────────────────
TOTAL_DAILY=$(du -sh "$BACKUP_DIR/daily/" 2>/dev/null | cut -f1)
TOTAL_WEEKLY=$(du -sh "$BACKUP_DIR/weekly/" 2>/dev/null | cut -f1)
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')

log "=== BACKUP CONCLUÍDO ==="
log "  Diários: $TOTAL_DAILY | Semanais: $TOTAL_WEEKLY | Disco livre: $DISK_FREE"

if [ "$ERRORS" -gt 0 ]; then
    log "  ⚠️ $ERRORS erro(s) durante o backup!"
    exit 1
fi

exit 0
