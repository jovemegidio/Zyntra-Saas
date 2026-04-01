# ============================================
# ALUFORCE — Deploy n8n no VPS Hostinger
# ============================================
# Este script configura o n8n completo na VPS:
# 1. Cria banco de dados n8n no MySQL
# 2. Envia arquivos para o VPS
# 3. Configura variáveis de ambiente
# 4. Configura Nginx reverse proxy
# 5. Gera certificado SSL (Let's Encrypt)
# 6. Sobe o container n8n + Restart PM2
# ============================================

param(
    [switch]$ApenasDB,      # Só cria o banco
    [switch]$ApenasDeploy,  # Só envia arquivos
    [switch]$ApenasStart,   # Só sobe o container
    [switch]$Status         # Verifica status
)

# ── Configuração ──────────────────────────────
$servidor = "YOUR_VPS_IP"
$usuario = "root"
$senha = if ($env:VPS_PASSWORD) { $env:VPS_PASSWORD } else { Read-Host "Senha VPS" }
$n8nPassword = if ($env:N8N_PASSWORD) { $env:N8N_PASSWORD } else { Read-Host "Senha n8n" }
$caminhoRemoto = "/var/www/aluforce"
$caminhoLocal = $PSScriptRoot
if (-not $caminhoLocal) {
    $caminhoLocal = "G:\Outros computadores\Meu laptop (2)\Sistema - ALUFORCE - V.2"
}

# PuTTY no PATH
if (-not (Get-Command pscp -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\Program Files\PuTTY"
}

# ── Operadores bash (evita conflitos com parser PS 5.1) ──
$OR = '||'
$AND = '&&'
$ERR = '2>&1'
$DEVNULL = '2>/dev/null'
$STDIN = '<'

# ── Funções Auxiliares ────────────────────────
function SSH-Executar {
    param([string]$comando)
    $result = plink -batch -pw $senha $usuario@$servidor $comando 2>&1
    return $result
}

function Enviar-Arquivo {
    param([string]$arquivoLocal, [string]$arquivoRemoto)
    
    $dirRemoto = Split-Path $arquivoRemoto -Parent
    if ($dirRemoto) {
        plink -batch -pw $senha $usuario@$servidor "mkdir -p $dirRemoto" 2>$null
    }
    
    pscp -batch -pw $senha -q "$arquivoLocal" "${usuario}@${servidor}:$arquivoRemoto" 2>$null
    return $LASTEXITCODE -eq 0
}

# ── Banner ────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   🤖 ALUFORCE — Deploy n8n Automation   ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  📡 VPS: $servidor" -ForegroundColor DarkGray
Write-Host "  ⏰ $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor DarkGray
Write-Host ""

# ══════════════════════════════════════════════
# VERIFICAR STATUS (flag -Status)
# ══════════════════════════════════════════════
if ($Status) {
    Write-Host "🔍 Verificando status do n8n na VPS..." -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar container
    $cmd = "docker ps --filter name=n8n --format '{{.Status}}' $DEVNULL $OR echo 'Docker nao disponivel'"
    $containerStatus = SSH-Executar $cmd
    Write-Host "  🐳 Container: " -NoNewline
    if ($containerStatus -match "Up") {
        Write-Host "$containerStatus" -ForegroundColor Green
    } else {
        Write-Host "$containerStatus" -ForegroundColor Red
    }
    
    # Verificar porta 5678
    $cmd = "curl -s -o /dev/null -w '%{http_code}' http://localhost:5678/healthz $DEVNULL $OR echo 000"
    $portCheck = SSH-Executar $cmd
    Write-Host "  🌐 HTTP :5678: " -NoNewline
    if ($portCheck -match "200") {
        Write-Host "OK (200)" -ForegroundColor Green
    } else {
        Write-Host "Falhou ($portCheck)" -ForegroundColor Red
    }
    
    # Verificar banco n8n
    $dbCmd = "mysql -u root -e `"SELECT 'OK' AS status FROM information_schema.schemata WHERE schema_name='n8n'`" $DEVNULL"
    $dbCheck = SSH-Executar $dbCmd
    Write-Host "  💾 Banco n8n: " -NoNewline
    if ($dbCheck -match "OK") {
        Write-Host "Existe" -ForegroundColor Green
    } else {
        Write-Host "Não existe" -ForegroundColor Yellow
    }
    
    Write-Host ""
    exit 0
}

# ══════════════════════════════════════════════
# ETAPA 1: Criar banco de dados n8n no MySQL
# ══════════════════════════════════════════════
if (-not $ApenasDeploy -and -not $ApenasStart) {
    Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "  ETAPA 1/6: Criar banco de dados n8n" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    
    # Verificar se já existe
    Write-Host "  🔍 Verificando se banco 'n8n' já existe..." -ForegroundColor Yellow
    $dbExistsCmd = "mysql -u root -e `"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='n8n'`" -sN $DEVNULL"
    $dbExists = SSH-Executar $dbExistsCmd
    
    if ($dbExists -match "1") {
        Write-Host "  ✅ Banco 'n8n' já existe — pulando criação" -ForegroundColor Green
    } else {
        Write-Host "  📦 Criando banco de dados 'n8n'..." -ForegroundColor Yellow
        
        $sqlCommands = @"
CREATE DATABASE IF NOT EXISTS n8n CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'localhost' IDENTIFIED BY '$senha';
GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'%' IDENTIFIED BY '$senha';
FLUSH PRIVILEGES;
SELECT 'BANCO_N8N_CRIADO' AS resultado;
"@
        
        $mysqlCmd = "mysql -u root -e `"$sqlCommands`" $ERR"
        $result = SSH-Executar $mysqlCmd
        
        if ($result -match "BANCO_N8N_CRIADO") {
            Write-Host "  ✅ Banco 'n8n' criado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Resultado: $result" -ForegroundColor Yellow
            Write-Host "  Tentando método alternativo..." -ForegroundColor Yellow
            
            # Método alternativo via arquivo SQL
            $sqlFile = Join-Path $env:TEMP "create_n8n_db.sql"
            @"
CREATE DATABASE IF NOT EXISTS n8n CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'n8n_user'@'%' IDENTIFIED BY 'n8n_aluforce_2026';
GRANT ALL PRIVILEGES ON n8n.* TO 'n8n_user'@'%';
GRANT ALL PRIVILEGES ON n8n.* TO 'aluforce'@'%';
FLUSH PRIVILEGES;
"@ | Set-Content $sqlFile -Encoding UTF8
            
            Enviar-Arquivo $sqlFile "/tmp/create_n8n_db.sql"
            $cmd = "mysql -u root $STDIN /tmp/create_n8n_db.sql $AND rm /tmp/create_n8n_db.sql"
            SSH-Executar $cmd
            Write-Host "  ✅ Banco criado via arquivo SQL" -ForegroundColor Green
        }
    }
    Write-Host ""
    
    if ($ApenasDB) { exit 0 }
}

# ══════════════════════════════════════════════
# ETAPA 2: Enviar arquivos n8n para VPS
# ══════════════════════════════════════════════
if (-not $ApenasStart) {
    Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "  ETAPA 2/6: Enviar arquivos para VPS" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    
    # Criar diretórios no VPS
    Write-Host "  📁 Criando diretórios..." -ForegroundColor Yellow
    SSH-Executar "mkdir -p $caminhoRemoto/n8n/workflows $caminhoRemoto/routes $caminhoRemoto/services $caminhoRemoto/ssl"
    
    # Lista de arquivos para enviar
    $arquivos = @(
        @{ local = "n8n\.env.example";                          remoto = "$caminhoRemoto/n8n/.env.example" },
        @{ local = "routes\n8n-webhooks.js";                    remoto = "$caminhoRemoto/routes/n8n-webhooks.js" },
        @{ local = "services\n8n-integration.js";               remoto = "$caminhoRemoto/services/n8n-integration.js" },
        @{ local = "docker-compose.yml";                        remoto = "$caminhoRemoto/docker-compose.yml" },
        @{ local = "server.js";                                 remoto = "$caminhoRemoto/server.js" },
        @{ local = "n8n\workflows\01-relatorio-vendas-diario.json";  remoto = "$caminhoRemoto/n8n/workflows/01-relatorio-vendas-diario.json" },
        @{ local = "n8n\workflows\02-backup-banco-dados.json";      remoto = "$caminhoRemoto/n8n/workflows/02-backup-banco-dados.json" },
        @{ local = "n8n\workflows\03-contas-vencer-cobranca.json";   remoto = "$caminhoRemoto/n8n/workflows/03-contas-vencer-cobranca.json" },
        @{ local = "n8n\workflows\04-estoque-critico-alerta.json";   remoto = "$caminhoRemoto/n8n/workflows/04-estoque-critico-alerta.json" },
        @{ local = "n8n\workflows\05-health-check-monitoramento.json"; remoto = "$caminhoRemoto/n8n/workflows/05-health-check-monitoramento.json" },
        @{ local = "n8n\workflows\06-pedidos-atrasados-alerta.json"; remoto = "$caminhoRemoto/n8n/workflows/06-pedidos-atrasados-alerta.json" },
        @{ local = "n8n\workflows\07-aniversariantes-email.json";    remoto = "$caminhoRemoto/n8n/workflows/07-aniversariantes-email.json" },
        @{ local = "ssl\nginx-n8n.conf";                                remoto = "$caminhoRemoto/ssl/nginx-n8n.conf" }
    )
    
    $enviados = 0
    $erros = 0
    
    foreach ($arq in $arquivos) {
        $localFull = Join-Path $caminhoLocal $arq.local
        
        if (-not (Test-Path $localFull)) {
            Write-Host "  ❌ Não encontrado: $($arq.local)" -ForegroundColor Red
            $erros++
            continue
        }
        
        Write-Host "  📤 " -NoNewline -ForegroundColor Yellow
        Write-Host "$($arq.local)" -NoNewline -ForegroundColor White
        
        $ok = Enviar-Arquivo $localFull $arq.remoto
        if ($ok) {
            Write-Host " ✅" -ForegroundColor Green
            $enviados++
        } else {
            Write-Host " ❌" -ForegroundColor Red
            $erros++
        }
    }
    
    Write-Host ""
    Write-Host "  📊 Enviados: $enviados | Erros: $erros" -ForegroundColor $(if ($erros -eq 0) { "Green" } else { "Yellow" })
    Write-Host ""
}

# ══════════════════════════════════════════════
# ETAPA 3: Configurar variáveis de ambiente
# ══════════════════════════════════════════════
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  ETAPA 3/6: Configurar .env do n8n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Gerar chaves seguras
$apiKey = [guid]::NewGuid().ToString()
$encryptionKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Host "  🔑 API Key gerada: $($apiKey.Substring(0,8))..." -ForegroundColor DarkGray
Write-Host "  🔐 Encryption Key gerada: $($encryptionKey.Substring(0,8))..." -ForegroundColor DarkGray

# Verificar se já existe .env com variáveis n8n
$envCmd = "grep -c N8N_ENABLED $caminhoRemoto/.env $DEVNULL $OR echo 0"
$envCheck = SSH-Executar $envCmd

if ($envCheck -match "^[1-9]") {
    Write-Host "  ✅ Variáveis n8n já existem no .env — pulando" -ForegroundColor Green
} else {
    Write-Host "  📝 Adicionando variáveis n8n ao .env..." -ForegroundColor Yellow
    
    $n8nEnvBlock = @"

# ============================================
# N8N — Workflow Automation (adicionado em $(Get-Date -Format 'dd/MM/yyyy'))
# ============================================
N8N_ENABLED=true
N8N_HOST=n8n.aluforce.api.br
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://n8n.aluforce.api.br/
N8N_AUTH_USER=admin
N8N_AUTH_PASSWORD=$n8nPassword
N8N_ENCRYPTION_KEY=$encryptionKey
N8N_API_KEY=$apiKey
N8N_DB_NAME=n8n
"@
    
    # Criar arquivo temporário com o bloco
    $tempFile = Join-Path $env:TEMP "n8n_env_block.txt"
    $n8nEnvBlock | Set-Content $tempFile -Encoding UTF8 -NoNewline
    
    Enviar-Arquivo $tempFile "/tmp/n8n_env_block.txt"
    $catCmd = "cat /tmp/n8n_env_block.txt >> $caminhoRemoto/.env $AND rm /tmp/n8n_env_block.txt"
    SSH-Executar $catCmd
    
    Write-Host "  ✅ Variáveis n8n adicionadas ao .env" -ForegroundColor Green
    Write-Host ""
    Write-Host "  📋 Credenciais do n8n:" -ForegroundColor White
    Write-Host "     URL:    https://n8n.aluforce.api.br" -ForegroundColor Cyan
    Write-Host "     Login:  admin" -ForegroundColor Cyan
    Write-Host "     Senha:  (definida via \$env:N8N_PASSWORD)" -ForegroundColor Cyan
    Write-Host "     API Key: $apiKey" -ForegroundColor DarkGray
}
Write-Host ""

# ══════════════════════════════════════════════
# ETAPA 4: Configurar Nginx Reverse Proxy
# ══════════════════════════════════════════════
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  ETAPA 4/6: Configurar Nginx" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Verificar se Nginx está instalado
$cmd = "nginx -v $ERR $OR echo NOT_INSTALLED"
$nginxCheck = SSH-Executar $cmd

if ($nginxCheck -match "NOT_INSTALLED") {
    Write-Host "  📦 Instalando Nginx..." -ForegroundColor Yellow
    $cmd = "apt update $AND apt install nginx -y $ERR"
    SSH-Executar $cmd | Out-Null
    $cmd = "systemctl enable nginx $AND systemctl start nginx"
    SSH-Executar $cmd
    Write-Host "  ✅ Nginx instalado e iniciado" -ForegroundColor Green
} else {
    Write-Host "  ✅ Nginx encontrado: $($nginxCheck.Trim())" -ForegroundColor Green
}

# Enviar configuração do n8n para Nginx
Write-Host "  📤 Enviando configuração Nginx para n8n..." -ForegroundColor Yellow
$nginxConf = Join-Path $caminhoLocal "ssl\nginx-n8n.conf"

if (Test-Path $nginxConf) {
    Enviar-Arquivo $nginxConf "/etc/nginx/sites-available/n8n.conf"
    
    # Criar symlink em sites-enabled
    SSH-Executar "ln -sf /etc/nginx/sites-available/n8n.conf /etc/nginx/sites-enabled/n8n.conf"
    
    # Testar configuração
    $nginxTest = SSH-Executar "nginx -t $ERR"
    
    if ($nginxTest -match "successful") {
        Write-Host "  ✅ Configuração Nginx válida" -ForegroundColor Green
        SSH-Executar "systemctl reload nginx"
        Write-Host "  ✅ Nginx recarregado" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Erro na config Nginx: $nginxTest" -ForegroundColor Yellow
        Write-Host "  💡 O SSL ainda não foi gerado — isso é normal neste passo" -ForegroundColor DarkGray
        Write-Host "  💡 Vamos criar uma versão temporária sem SSL..." -ForegroundColor Yellow
        
        # Criar config temporária HTTP-only para certbot funcionar
        $tempNginxLines = @(
            'server {'
            '    listen 80;'
            '    server_name n8n.aluforce.api.br;'
            ''
            '    location /.well-known/acme-challenge/ {'
            '        root /var/www/certbot;'
            '    }'
            ''
            '    location / {'
            '        proxy_pass http://127.0.0.1:5678;'
            '        proxy_http_version 1.1;'
            '        proxy_set_header Upgrade $http_upgrade;'
            '        proxy_set_header Connection "upgrade";'
            '        proxy_set_header Host $host;'
            '        proxy_set_header X-Real-IP $remote_addr;'
            '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;'
            '        proxy_set_header X-Forwarded-Proto $scheme;'
            '    }'
            '}'
        )
        $tempFile = Join-Path $env:TEMP "nginx_n8n_temp.conf"
        $tempNginxLines | Set-Content $tempFile -Encoding UTF8
        Enviar-Arquivo $tempFile "/etc/nginx/sites-available/n8n.conf"
        SSH-Executar "ln -sf /etc/nginx/sites-available/n8n.conf /etc/nginx/sites-enabled/n8n.conf"
        SSH-Executar "systemctl reload nginx"
        Write-Host "  ✅ Config HTTP temporária ativada (para certbot)" -ForegroundColor Green
    }
} else {
    Write-Host "  ❌ Arquivo ssl/nginx-n8n.conf não encontrado!" -ForegroundColor Red
    Write-Host "  Criando config padrão..." -ForegroundColor Yellow
    
    # Config HTTP-only fallback — cria remotamente
    $fallbackLines = @(
        'server {'
        '    listen 80;'
        '    server_name n8n.aluforce.api.br;'
        '    location /.well-known/acme-challenge/ { root /var/www/certbot; }'
        '    location / {'
        '        proxy_pass http://127.0.0.1:5678;'
        '        proxy_http_version 1.1;'
        '        proxy_set_header Upgrade $http_upgrade;'
        '        proxy_set_header Connection "upgrade";'
        '        proxy_set_header Host $host;'
        '        proxy_set_header X-Real-IP $remote_addr;'
        '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;'
        '        proxy_set_header X-Forwarded-Proto $scheme;'
        '    }'
        '}'
    )
    $tempFallback = Join-Path $env:TEMP "nginx_n8n_fallback.conf"
    $fallbackLines | Set-Content $tempFallback -Encoding UTF8
    Enviar-Arquivo $tempFallback "/etc/nginx/sites-available/n8n.conf"
    SSH-Executar "ln -sf /etc/nginx/sites-available/n8n.conf /etc/nginx/sites-enabled/n8n.conf"
    SSH-Executar "systemctl reload nginx"
    Write-Host "  ✅ Config HTTP padrão criada" -ForegroundColor Green
}

# Criar diretório para certbot
SSH-Executar "mkdir -p /var/www/certbot"
$skipSSL = $false
Write-Host ""

# ══════════════════════════════════════════════
# ETAPA 5: Gerar certificado SSL (Let's Encrypt)
# ══════════════════════════════════════════════
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  ETAPA 5/6: Certificado SSL" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Verificar se DNS resolve
Write-Host "  🌐 Verificando DNS de n8n.aluforce.api.br..." -ForegroundColor Yellow
$cmd = "dig +short n8n.aluforce.api.br $DEVNULL $OR nslookup n8n.aluforce.api.br $DEVNULL | grep -oE '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' | tail -1"
$dnsCheck = SSH-Executar $cmd

if ($dnsCheck -match "31\.97\.64\.102") {
    Write-Host "  ✅ DNS resolve para $($dnsCheck.Trim()) — perfeito!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  DNS ainda NÃO resolve para n8n.aluforce.api.br" -ForegroundColor Red
    Write-Host "  ℹ️  Resposta: $dnsCheck" -ForegroundColor DarkGray
    Write-Host "" 
    Write-Host "  📋 Configure o DNS no painel Hostinger:" -ForegroundColor Yellow
    Write-Host "     1. Acesse hpanel.hostinger.com → Domínios → aluforce.api.br" -ForegroundColor White
    Write-Host "     2. Vá em 'DNS / Nameservers' → 'Gerenciar DNS'" -ForegroundColor White
    Write-Host "     3. Adicione registro tipo A:" -ForegroundColor White
    Write-Host "        Nome: n8n" -ForegroundColor Cyan
    Write-Host "        Tipo: A" -ForegroundColor Cyan
    Write-Host "        Valor: YOUR_VPS_IP" -ForegroundColor Cyan
    Write-Host "        TTL: 14400" -ForegroundColor Cyan
    Write-Host "     4. Aguarde 5-30 min para propagação DNS" -ForegroundColor White
    Write-Host ""
    
    $continuar = Read-Host "  Deseja tentar gerar SSL mesmo assim? (S/n)"
    if ($continuar -eq "n" -or $continuar -eq "N") {
        Write-Host "  ⏭️  Pulando SSL — n8n ficará acessível via HTTP na porta 5678" -ForegroundColor Yellow
        Write-Host "  💡 Execute novamente depois: .\deploy-n8n.ps1 -ApenasStart" -ForegroundColor DarkGray
        Write-Host ""
        # Pular para etapa 6
        $skipSSL = $true
    }
}

if (-not $skipSSL) {
    # Verificar se certbot está instalado
    $cmd = "certbot --version $ERR $OR echo NOT_INSTALLED"
    $certbotCheck = SSH-Executar $cmd
    
    if ($certbotCheck -match "NOT_INSTALLED") {
        Write-Host "  📦 Instalando certbot..." -ForegroundColor Yellow
        $cmd = "apt update $AND apt install certbot python3-certbot-nginx -y $ERR"
        SSH-Executar $cmd | Out-Null
        Write-Host "  ✅ Certbot instalado" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Certbot encontrado: $($certbotCheck.Trim())" -ForegroundColor Green
    }
    
    # Verificar se certificado já existe
    $cmd = "test -f /etc/letsencrypt/live/n8n.aluforce.api.br/fullchain.pem $AND echo EXISTS $OR echo NOT_FOUND"
    $certExists = SSH-Executar $cmd
    
    if ($certExists -match "EXISTS") {
        Write-Host "  ✅ Certificado SSL já existe — renovando se necessário..." -ForegroundColor Green
        SSH-Executar "certbot renew --dry-run $ERR" | Out-Null
    } else {
        Write-Host "  🔐 Gerando certificado SSL com Let's Encrypt..." -ForegroundColor Yellow
        Write-Host "  ⏳ Isso pode levar 30-60 segundos..." -ForegroundColor DarkGray
        
        $certResult = SSH-Executar "certbot --nginx -d n8n.aluforce.api.br --non-interactive --agree-tos --email admin@your-domain.com --redirect $ERR"
        
        if ($certResult -match "Successfully|Congratulations") {
            Write-Host "  ✅ Certificado SSL gerado com sucesso!" -ForegroundColor Green
            
            # Agora sim, enviar a config completa com SSL
            Write-Host "  📤 Aplicando config Nginx com SSL..." -ForegroundColor Yellow
            Enviar-Arquivo $nginxConf "/etc/nginx/sites-available/n8n.conf"
            
            $nginxTest2 = SSH-Executar "nginx -t $ERR"
            if ($nginxTest2 -match "successful") {
                SSH-Executar "systemctl reload nginx"
                Write-Host "  ✅ Nginx configurado com HTTPS!" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  Config SSL falhou, mantendo config do certbot" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠️  Erro ao gerar certificado SSL:" -ForegroundColor Red
            Write-Host "  $($certResult | Select-Object -Last 5)" -ForegroundColor DarkGray
            Write-Host "" 
            Write-Host "  💡 Possíveis causas:" -ForegroundColor Yellow
            Write-Host "     - DNS não propagou ainda (aguarde 5-30 min)" -ForegroundColor White
            Write-Host "     - Porta 80 não está aberta no firewall" -ForegroundColor White
            Write-Host "     - Nginx não está rodando" -ForegroundColor White
            Write-Host ""
            Write-Host "  🔄 Tente manualmente na VPS:" -ForegroundColor Yellow
            Write-Host "     certbot --nginx -d n8n.aluforce.api.br" -ForegroundColor Cyan
        }
    }
    
    # Configurar renovação automática
    $cmd = "crontab -l $DEVNULL | grep -c 'certbot renew' $OR echo 0"
    $cronExists = SSH-Executar $cmd
    if ($cronExists -match "^0") {
        Write-Host "  🔄 Configurando renovação automática de SSL..." -ForegroundColor Yellow
        $cmd = "(crontab -l $DEVNULL; echo '0 3 * * * certbot renew --quiet --post-hook systemctl reload nginx') | crontab -"
        SSH-Executar $cmd
        Write-Host "  ✅ Cron de renovação SSL configurado (todo dia 3h)" -ForegroundColor Green
    }
}
Write-Host ""

# ══════════════════════════════════════════════
# ETAPA 6: Subir container n8n + Restart PM2
# ══════════════════════════════════════════════
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  ETAPA 6/6: Iniciar n8n + Restart" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Verificar se Docker está instalado
$cmd = "docker --version $DEVNULL $OR echo NOT_INSTALLED"
$dockerCheck = SSH-Executar $cmd

if ($dockerCheck -match "NOT_INSTALLED") {
    Write-Host "  ⚠️  Docker NÃO está instalado na VPS!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Para instalar o Docker, execute na VPS:" -ForegroundColor Yellow
    Write-Host "     curl -fsSL https://get.docker.com | sh" -ForegroundColor White
    Write-Host "     systemctl enable docker" -ForegroundColor White
    Write-Host "     systemctl start docker" -ForegroundColor White
    Write-Host ""
    Write-Host "  Depois instale o docker-compose:" -ForegroundColor Yellow
    Write-Host "     apt install docker-compose-plugin -y" -ForegroundColor White
    Write-Host ""
    
    # Alternativa: Instalar n8n via NPM global
    Write-Host "  🔄 Alternativa: Instalar n8n via NPM (sem Docker)..." -ForegroundColor Yellow
    Write-Host ""
    
    $instalarNPM = Read-Host "  Deseja instalar n8n via NPM global? (S/n)"
    
    if ($instalarNPM -ne "n" -and $instalarNPM -ne "N") {
        Write-Host "  📦 Instalando n8n via npm..." -ForegroundColor Yellow
        SSH-Executar "npm install -g n8n $ERR"
        
        Write-Host "  📝 Criando serviço systemd para n8n..." -ForegroundColor Yellow
        
        $systemdService = @"
[Unit]
Description=n8n Workflow Automation
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=$caminhoRemoto
Environment=N8N_HOST=n8n.aluforce.api.br
Environment=N8N_PORT=5678
Environment=N8N_PROTOCOL=https
Environment=WEBHOOK_URL=https://n8n.aluforce.api.br/
Environment=GENERIC_TIMEZONE=America/Sao_Paulo
Environment=DB_TYPE=mysqldb
Environment=DB_MYSQLDB_HOST=localhost
Environment=DB_MYSQLDB_PORT=3306
Environment=DB_MYSQLDB_DATABASE=n8n
Environment=DB_MYSQLDB_USER=root
Environment=DB_MYSQLDB_PASSWORD=
Environment=N8N_BASIC_AUTH_ACTIVE=true
Environment=N8N_BASIC_AUTH_USER=admin
Environment=N8N_BASIC_AUTH_PASSWORD=$n8nPassword
Environment=N8N_ENCRYPTION_KEY=$encryptionKey
ExecStart=/usr/bin/n8n start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"@
        
        $tempService = Join-Path $env:TEMP "n8n.service"
        $systemdService | Set-Content $tempService -Encoding UTF8
        
        Enviar-Arquivo $tempService "/etc/systemd/system/n8n.service"
        
        $cmd = "systemctl daemon-reload $AND systemctl enable n8n $AND systemctl start n8n"
        SSH-Executar $cmd
        
        Start-Sleep -Seconds 5
        $n8nStatus = SSH-Executar "systemctl is-active n8n"
        
        if ($n8nStatus -match "active") {
            Write-Host "  ✅ n8n rodando via systemd!" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Verificar: systemctl status n8n" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  🐳 Docker encontrado: $($dockerCheck.Trim())" -ForegroundColor Green
    
    # Subir n8n via docker-compose
    Write-Host "  🚀 Iniciando container n8n..." -ForegroundColor Yellow
    $composeCmd = "cd $caminhoRemoto $AND docker compose up -d n8n $ERR $OR docker-compose up -d n8n $ERR"
    $composeResult = SSH-Executar $composeCmd
    Write-Host "  $composeResult" -ForegroundColor DarkGray
    
    # Aguardar n8n inicializar
    Write-Host "  ⏳ Aguardando n8n inicializar (30s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Verificar se está rodando
    $healthCheck = SSH-Executar "curl -s -o /dev/null -w '%{http_code}' http://localhost:5678/healthz $DEVNULL"
    
    if ($healthCheck -match "200") {
        Write-Host "  ✅ n8n está rodando!" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  n8n respondeu com: $healthCheck (pode estar ainda inicializando)" -ForegroundColor Yellow
        Write-Host "  💡 Verifique logs: docker logs n8n --tail 50" -ForegroundColor DarkGray
    }
}

# Restart PM2 para carregar as novas rotas n8n
Write-Host ""
Write-Host "  🔄 Reiniciando PM2 (server.js atualizado)..." -ForegroundColor Yellow
$pm2Cmd = "cd $caminhoRemoto $AND pm2 restart aluforce-v2-production $ERR $OR pm2 restart all $ERR"
$pm2Result = SSH-Executar $pm2Cmd
Write-Host "  $($pm2Result | Select-Object -First 3)" -ForegroundColor DarkGray

# ══════════════════════════════════════════════
# RESUMO FINAL
# ══════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ✅ Deploy n8n Concluído!          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Painel n8n: " -NoNewline; Write-Host "https://n8n.aluforce.api.br" -ForegroundColor Cyan
Write-Host "  👤 Login:      " -NoNewline; Write-Host "admin" -ForegroundColor White
Write-Host "  🔑 Senha:      " -NoNewline; Write-Host "(definida via `$env:N8N_PASSWORD)" -ForegroundColor White
Write-Host ""
Write-Host "  📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "     1. Acesse https://n8n.aluforce.api.br" -ForegroundColor White
Write-Host "     2. Vá em Workflows → Import from File" -ForegroundColor White
Write-Host "     3. Importe os 7 arquivos .json da pasta n8n/workflows/" -ForegroundColor White
Write-Host "     4. Configure as credenciais SMTP no n8n" -ForegroundColor White
Write-Host "     5. Ative cada workflow (toggle ON)" -ForegroundColor White
Write-Host "     6. Teste cada workflow manualmente antes de desligar cron jobs" -ForegroundColor White
Write-Host ""
Write-Host "  🔍 Verificar status: " -NoNewline
Write-Host ".\deploy-n8n.ps1 -Status" -ForegroundColor Cyan
Write-Host ""
