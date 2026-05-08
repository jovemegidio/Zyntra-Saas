#!/usr/bin/env bash
# =================================================================
# DEPLOY LABOR ELETRIC + LABOR ENERGY
# Sincroniza o código atual da Aluforce para as empresas Labor,
# aplica configurações de branding e reinicia os processos PM2.
#
# Uso: bash deploy/deploy-labor-companies.sh [labor-eletric|labor-energy|all]
# Exemplo: bash deploy/deploy-labor-companies.sh all
# =================================================================
set -euo pipefail

ALUFORCE_DIR="/var/www/aluforce"
LABOR_ELETRIC_DIR="/var/www/labor-eletric"
LABOR_ENERGY_DIR="/var/www/labor-energy"

LABOR_ELETRIC_DB="labor_eletric_vendas"
LABOR_ENERGY_DB="labor_energy_vendas"

LABOR_ELETRIC_PORT=3001
LABOR_ENERGY_PORT=3002

LABOR_ELETRIC_PM2="labor-eletric-production"
LABOR_ENERGY_PM2="labor-energy-production"

TARGET="${1:-all}"

# ── Funções auxiliares ─────────────────────────────────────────────

log() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()  { echo -e "\033[1;32m[ OK ]\033[0m $*"; }
err() { echo -e "\033[1;31m[ERRO]\033[0m $*" >&2; }

# Lê o .env do Aluforce para pegar JWT_SECRET, REDIS_URL, etc.
get_env_value() {
    local key="$1"
    grep -E "^${key}=" "${ALUFORCE_DIR}/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true
}

deploy_company() {
    local name="$1"          # labor-eletric | labor-energy
    local dir="$2"           # /var/www/labor-eletric
    local db="$3"            # labor_eletric_vendas
    local port="$4"          # 3001
    local pm2name="$5"       # labor-eletric-production
    local brand_name="$6"    # LABOR ELETRIC
    local email_domain="$7"  # @laboreletric.com.br
    local logo_file="$8"     # labor-eletric-logo.png

    log "========================================================"
    log " Deployando: ${brand_name}"
    log "========================================================"

    # 1. Garantir que o diretório existe
    mkdir -p "$dir"

    # 2. Sincronizar código do Aluforce → Labor
    log "Sincronizando código de ${ALUFORCE_DIR} → ${dir}..."
    rsync -a --delete \
        --exclude='.env' \
        --exclude='node_modules/' \
        --exclude='logs/' \
        --exclude='uploads/' \
        --exclude='backups/' \
        --exclude='.git/' \
        --exclude='*.log' \
        --exclude='desktop.ini' \
        "${ALUFORCE_DIR}/" "${dir}/"
    ok "Código sincronizado."

    # 3. Instalar/atualizar dependências Node
    log "Instalando dependências npm..."
    cd "$dir"
    npm install --omit=dev --no-audit --no-fund --silent
    ok "Dependências instaladas."

    # 4. Criar/atualizar .env
    log "Gerando .env para ${brand_name}..."
    JWT_SECRET=$(get_env_value JWT_SECRET)
    REFRESH_SECRET=$(get_env_value REFRESH_SECRET)
    SESSION_SECRET=$(get_env_value SESSION_SECRET)
    DB_PASSWORD=$(get_env_value DB_PASSWORD)
    REDIS_URL=$(get_env_value REDIS_URL)

    cat > "${dir}/.env" << ENV
NODE_ENV=production
PORT=${port}
HOST=0.0.0.0

# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${db}
DB_USER=aluforce
DB_PASSWORD=${DB_PASSWORD}
DB_CONN_LIMIT=20

# Branding
BRAND=${name}
MOUNT_PATH=/${name}

# Segurança
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
REFRESH_SECRET=${REFRESH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
COOKIE_HTTPONLY=true
ENABLE_CSRF=true

# Redis
REDIS_URL=${REDIS_URL}

# Rate limiting
LOGIN_RATE_LIMIT=5
API_RATE_LIMIT=100

# Logs
LOG_LEVEL=info
LOG_TO_FILE=true

# Auditoria
AUDIT_ENABLED=true
AUDIT_RETENTION_DAYS=365
ENV
    ok ".env criado."

    # 5. Criar diretórios de log/backup necessários
    mkdir -p "/var/log/${name}" "/var/backups/${name}" "/tmp/${name//-/_}_excel"

    # 6. Copiar PM2 ecosystem config
    cp "${ALUFORCE_DIR}/ecosystem.${name}.config.js" "${dir}/ecosystem.config.js"

    # 7. Iniciar ou reiniciar PM2
    log "Iniciando/reiniciando PM2: ${pm2name}..."
    cd "$dir"
    if pm2 describe "${pm2name}" > /dev/null 2>&1; then
        pm2 restart "${pm2name}" --update-env
        ok "Processo PM2 '${pm2name}' reiniciado."
    else
        pm2 start ecosystem.config.js --env production
        ok "Processo PM2 '${pm2name}' iniciado."
    fi
    pm2 save

    # 8. Aguardar e verificar saúde
    log "Aguardando inicialização (5s)..."
    sleep 5
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}/api/health" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        ok "${brand_name} respondendo em :${port} (HTTP 200)"
    else
        err "${brand_name} em :${port} retornou HTTP ${HTTP_STATUS} — verifique logs: pm2 logs ${pm2name}"
    fi

    echo ""
}

# ── Configurar nginx ───────────────────────────────────────────────

setup_nginx() {
    log "Configurando Nginx para empresas Labor (path-based em aluforce.api.br)..."

    NGINX_CONF_SRC="${ALUFORCE_DIR}/deploy/nginx.conf"
    NGINX_SITES="/etc/nginx/sites-enabled"
    NGINX_AVAILABLE="/etc/nginx/sites-available"

    # Verificar se o nginx.conf do projeto existe
    if [ ! -f "$NGINX_CONF_SRC" ]; then
        err "Arquivo nginx.conf não encontrado: ${NGINX_CONF_SRC}"
        err "Aplique manualmente os location blocks de deploy/nginx-labor-companies.conf"
        err "no server block HTTPS do aluforce.api.br."
        return 1
    fi

    # Determinar onde está o config ativo do aluforce.api.br
    ALUFORCE_NGINX=""
    for candidate in \
        "${NGINX_SITES}/aluforce" \
        "${NGINX_SITES}/aluforce.conf" \
        "${NGINX_AVAILABLE}/aluforce" \
        "/etc/nginx/nginx.conf"; do
        if [ -f "$candidate" ] && grep -q "aluforce.api.br" "$candidate" 2>/dev/null; then
            ALUFORCE_NGINX="$candidate"
            break
        fi
    done

    if [ -z "$ALUFORCE_NGINX" ]; then
        # Nenhum arquivo encontrado — copiar o nginx.conf do projeto
        log "Config ativo do aluforce.api.br não encontrado. Copiando deploy/nginx.conf..."
        cp "$NGINX_CONF_SRC" "${NGINX_AVAILABLE}/aluforce"
        ln -sf "${NGINX_AVAILABLE}/aluforce" "${NGINX_SITES}/aluforce" 2>/dev/null || true
        ALUFORCE_NGINX="${NGINX_SITES}/aluforce"
        ok "nginx.conf copiado para ${ALUFORCE_NGINX}."
    else
        # Verificar se os location blocks já estão presentes
        if grep -q "labor-eletric" "$ALUFORCE_NGINX" 2>/dev/null; then
            ok "Location blocks para Labor já presentes em ${ALUFORCE_NGINX}."
        else
            log "Adicionando location blocks Labor em ${ALUFORCE_NGINX}..."
            # Inserir os location blocks antes da última linha '}' do server block HTTPS
            SNIPPET="${ALUFORCE_DIR}/deploy/nginx-labor-companies.conf"
            # Adiciona os location blocks antes da diretiva error_page (ou antes do último })
            if grep -q "error_page" "$ALUFORCE_NGINX"; then
                sed -i "/^[[:space:]]*# ── Error Pages/i\\    # Incluir Labor Companies\\n    include ${ALUFORCE_DIR}/deploy/nginx-labor-companies.conf;" \
                    "$ALUFORCE_NGINX" 2>/dev/null || \
                err "Não foi possível inserir automaticamente. Edite ${ALUFORCE_NGINX} manualmente."
            else
                err "Não foi possível localizar o ponto de inserção em ${ALUFORCE_NGINX}."
                err "Adicione manualmente o conteúdo de deploy/nginx-labor-companies.conf."
            fi
        fi
    fi

    nginx -t && systemctl reload nginx && ok "Nginx recarregado com sucesso." || \
        err "Falha no nginx -t. Verifique a configuração manualmente."
}

# ── Execução principal ─────────────────────────────────────────────

case "$TARGET" in
    labor-eletric)
        deploy_company \
            "labor-eletric" "$LABOR_ELETRIC_DIR" "$LABOR_ELETRIC_DB" \
            "$LABOR_ELETRIC_PORT" "$LABOR_ELETRIC_PM2" \
            "LABOR ELETRIC" "@laboreletric.com.br" "labor-eletric-logo.png"
        ;;
    labor-energy)
        deploy_company \
            "labor-energy" "$LABOR_ENERGY_DIR" "$LABOR_ENERGY_DB" \
            "$LABOR_ENERGY_PORT" "$LABOR_ENERGY_PM2" \
            "LABOR ENERGY" "@laborenergy.com.br" "labor-energy-logo.png"
        ;;
    all)
        deploy_company \
            "labor-eletric" "$LABOR_ELETRIC_DIR" "$LABOR_ELETRIC_DB" \
            "$LABOR_ELETRIC_PORT" "$LABOR_ELETRIC_PM2" \
            "LABOR ELETRIC" "@laboreletric.com.br" "labor-eletric-logo.png"
        deploy_company \
            "labor-energy" "$LABOR_ENERGY_DIR" "$LABOR_ENERGY_DB" \
            "$LABOR_ENERGY_PORT" "$LABOR_ENERGY_PM2" \
            "LABOR ENERGY" "@laborenergy.com.br" "labor-energy-logo.png"
        setup_nginx
        ;;
    *)
        echo "Uso: $0 [labor-eletric|labor-energy|all]"
        exit 1
        ;;
esac

log "Deploy concluído!"
log ""
log "URLs de acesso (path-based no domínio Aluforce):"
log "  https://aluforce.api.br/labor-eletric/"
log "  https://aluforce.api.br/labor-energy/"
log ""
log "Próximos passos:"
log "  1. Verifique que os logs não têm erros: pm2 logs labor-eletric-production"
log "  2. Teste o health check:"
log "     curl http://127.0.0.1:3001/api/health"
log "     curl http://127.0.0.1:3002/api/health"
log "  3. Se o nginx.conf precisou de ajuste manual, edite o config do aluforce.api.br"
log "     e adicione o conteúdo de deploy/nginx-labor-companies.conf antes do error_page"
log "  4. Verifique: pm2 list | grep labor"
