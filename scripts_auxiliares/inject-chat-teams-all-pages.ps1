# ============================================================
# Script para injetar Chat Teams Widget em TODAS as páginas
# Adiciona socket.io + chat-widget.js antes de </body>
# ============================================================

$basePath = Split-Path -Parent $PSScriptRoot
$modulesPath = Join-Path $basePath "modules"

# Snippet a injetar
$chatSnippet = @"

    <!-- Chat Corporativo (Teams) -->
    <script src="/socket.io/socket.io.js"></script>
    <script src="/chat-teams/chat-widget.js?v=20260615" defer></script>
"@

$socketOnlySnippet = @"
    <script src="/socket.io/socket.io.js"></script>
"@

# Arquivos a pular (utilitários, demos, backups, fragmentos)
$skipPatterns = @(
    "preview_augusto",
    "index_utf8",
    "INSTRUCOES_MODAL",
    "diagnostico_sistema",
    "demonstracao_completa",
    "limpar_cache",
    "catalogo_produtos",
    "sistema_corrigido_final",
    "gerar_ordem_excel",
    "index_new",
    "PATCH_INDEX",
    "pcp_module_reference",
    "modal-produto-enriquecido",
    "modal-produto-rico",
    "modal_nova_ordem_saas",
    "sistema_funcional",
    "sidebar_dump",
    "popup-confirm",
    "demo-layout",
    "aluforce-layout",
    "header-sidebar",
    "header.html",
    "sidebar.html",
    "login.html"
)

$injected = 0
$socketFixed = 0
$skipped = 0
$alreadyOk = 0

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " INJEÇÃO CHAT TEAMS - TODAS AS PÁGINAS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$htmlFiles = Get-ChildItem -Path $modulesPath -Filter "*.html" -Recurse | Where-Object {
    $_.FullName -notmatch "backup|\.bak|node_modules|old_backup"
}

foreach ($file in $htmlFiles) {
    $relativePath = $file.FullName.Replace($basePath + "\", "")
    $fileName = $file.Name
    
    # Verificar se deve pular
    $shouldSkip = $false
    foreach ($pattern in $skipPatterns) {
        if ($fileName -like "*$pattern*" -or $relativePath -like "*$pattern*") {
            $shouldSkip = $true
            break
        }
    }
    
    # Pular _shared (fragmentos)
    if ($relativePath -like "*_shared*") {
        $shouldSkip = $true
    }
    
    if ($shouldSkip) {
        Write-Host "  SKIP: $relativePath" -ForegroundColor DarkGray
        $skipped++
        continue
    }
    
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    # Verificar se tem </body>
    if ($content -notmatch "</body>") {
        Write-Host "  SKIP (sem </body>): $relativePath" -ForegroundColor DarkGray
        $skipped++
        continue
    }
    
    $hasChat = $content -match "chat-teams/chat-widget"
    $hasSocket = $content -match "socket\.io/socket\.io\.js"
    
    if ($hasChat -and $hasSocket) {
        Write-Host "  OK: $relativePath" -ForegroundColor Green
        $alreadyOk++
        continue
    }
    
    if ($hasChat -and -not $hasSocket) {
        # Tem chat-teams mas falta socket.io - adicionar socket.io ANTES do chat-widget
        $content = $content -replace '(\s*<script src="/chat-teams/chat-widget\.js)', "    <script src=`"/socket.io/socket.io.js`"></script>`n`$1"
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  +SOCKET: $relativePath" -ForegroundColor Yellow
        $socketFixed++
        continue
    }
    
    # Não tem chat-teams - injetar snippet completo antes de </body>
    $content = $content -replace "(</body>)", "$chatSnippet`n`$1"
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  +CHAT: $relativePath" -ForegroundColor Cyan
    $injected++
}

# Também verificar public/index.html (dashboard principal)
$dashboardPath = Join-Path $basePath "public\index.html"
if (Test-Path $dashboardPath) {
    $content = Get-Content -Path $dashboardPath -Raw -Encoding UTF8
    $hasChat = $content -match "chat-teams/chat-widget"
    $hasSocket = $content -match "socket\.io/socket\.io\.js"
    
    if ($hasChat -and $hasSocket) {
        Write-Host "  OK: public\index.html" -ForegroundColor Green
    } elseif ($hasChat -and -not $hasSocket) {
        $content = $content -replace '(\s*<script src="/chat-teams/chat-widget\.js)', "    <script src=`"/socket.io/socket.io.js`"></script>`n`$1"
        Set-Content -Path $dashboardPath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  +SOCKET: public\index.html" -ForegroundColor Yellow
        $socketFixed++
    } elseif (-not $hasChat) {
        $content = $content -replace "(</body>)", "$chatSnippet`n`$1"
        Set-Content -Path $dashboardPath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  +CHAT: public\index.html" -ForegroundColor Cyan
        $injected++
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RESULTADO:" -ForegroundColor Cyan
Write-Host "  Chat injetado: $injected páginas" -ForegroundColor Cyan
Write-Host "  Socket.io adicionado: $socketFixed páginas" -ForegroundColor Yellow
Write-Host "  Já correto: $alreadyOk páginas" -ForegroundColor Green
Write-Host "  Pulados: $skipped páginas" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan
