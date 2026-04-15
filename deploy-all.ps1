#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
# ZYNTRA ERP — Deploy Script (Git + VPS + Branches)
# Faz commit, push para GitHub, upload para VPS e sincroniza
# todas as ramificações de empresas.
# ═══════════════════════════════════════════════════════════

param(
    [string]$Message = "",
    [switch]$SkipVPS,
    [switch]$SkipBranches,
    [switch]$SkipGit
)

$ErrorActionPreference = "Continue"

# ── Configurações ────────────────────────────────────────
$VPS_HOST = "root@31.97.64.102"
$VPS_PATH = "/var/www/aluforce"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$PROJECT_ROOT = $PSScriptRoot

# Bases que recebem cópia completa dos arquivos de sistema
$FULL_BASES = @(
    "Base/Labor Eletric/Sistema",
    "Base/Labor Energy/Sistema"
)

# Bases que recebem apenas módulos específicos
$PARTIAL_BASES = @(
    "Base/Demo",
    "Base/Comercio",
    "Base/Servicos",
    "Base/Agropecuario",
    "Base/Industria"
)

# Arquivos de sistema que devem ser sincronizados para FULL_BASES
$SYSTEM_FILES = @(
    "server.js",
    "routes/chat-routes.js",
    "routes/index.js",
    "_shared/confirm-dialog.js",
    "public/chat-teams/chat-widget.js",
    "public/chat-teams/chat-widget.css",
    "public/chat/widget.js",
    "modules/Compras/api/cotacoes.js",
    "modules/Compras/api/estoque.js",
    "modules/Compras/api/fornecedores.js",
    "modules/Compras/api/relatorios.js",
    "modules/Compras/cotacoes.js",
    "modules/Compras/fornecedores.html",
    "modules/Compras/fornecedores.js",
    "modules/Compras/relatorios.html",
    "modules/Compras/index.html",
    "modules/Financeiro/index.html",
    "modules/Vendas/index.html",
    ".eslintrc.json",
    "package.json"
)

# ── Funções ──────────────────────────────────────────────
function Write-Step { param([string]$Icon, [string]$Text); Write-Host "`n$Icon $Text" -ForegroundColor Cyan }
function Write-OK { param([string]$Text); Write-Host "  ✅ $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text); Write-Host "  ⚠️ $Text" -ForegroundColor Yellow }
function Write-Err { param([string]$Text); Write-Host "  ❌ $Text" -ForegroundColor Red }

# ── 1. Git Commit + Push ─────────────────────────────────
if (-not $SkipGit) {
    Write-Step "🐙" "Git — Commit + Push"
    Set-Location $PROJECT_ROOT

    git add -A 2>$null
    $status = git status --porcelain 2>$null
    if ($status) {
        if (-not $Message) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
            $changedCount = ($status | Measure-Object).Count
            $Message = "deploy: $changedCount arquivos atualizados em $timestamp"
        }
        git commit -m $Message 2>$null
        Write-OK "Commit: $Message"

        git push origin main 2>$null
        if ($LASTEXITCODE -eq 0) { Write-OK "Push para GitHub concluído" }
        else { Write-Warn "Push falhou — verifique conexão com GitHub" }
    } else {
        Write-OK "Nenhuma alteração para commit"
    }
}

# ── 2. Sincronizar Branches ─────────────────────────────
if (-not $SkipBranches) {
    Write-Step "🔄" "Sincronizando branches das empresas"

    foreach ($base in $FULL_BASES) {
        $synced = 0
        foreach ($f in $SYSTEM_FILES) {
            $src = Join-Path $PROJECT_ROOT $f
            $dst = Join-Path $PROJECT_ROOT "$base/$f"
            if (Test-Path $src) {
                $dstDir = Split-Path $dst
                if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
                Copy-Item $src $dst -Force
                $synced++
            }
        }
        Write-OK "$base => $synced arquivos sincronizados"
    }

    foreach ($base in $PARTIAL_BASES) {
        $synced = 0
        foreach ($f in $SYSTEM_FILES) {
            $src = Join-Path $PROJECT_ROOT $f
            $dst = Join-Path $PROJECT_ROOT "$base/$f"
            $dstDir = Split-Path $dst
            if ((Test-Path $src) -and (Test-Path $dstDir)) {
                Copy-Item $src $dst -Force
                $synced++
            }
        }
        if ($synced -gt 0) { Write-OK "$base => $synced arquivos sincronizados" }
    }
}

# ── 3. Deploy para VPS ──────────────────────────────────
if (-not $SkipVPS) {
    Write-Step "🚀" "Deploy para VPS ($VPS_HOST)"

    # Detectar arquivos alterados nos últimos 10 minutos ou desde último commit
    $changedFiles = git diff --name-only HEAD~1 2>$null
    if (-not $changedFiles) {
        # Fallback: arquivos modificados recentemente
        $changedFiles = Get-ChildItem -Path $PROJECT_ROOT -Recurse -File |
            Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-30) -and $_.FullName -notmatch 'node_modules|\.git|Base/' } |
            ForEach-Object { $_.FullName.Replace("$PROJECT_ROOT\", "").Replace("\", "/") }
    }

    if ($changedFiles) {
        $uploaded = 0
        foreach ($f in $changedFiles) {
            $localPath = Join-Path $PROJECT_ROOT $f
            if ((Test-Path $localPath) -and ($f -notmatch '^(node_modules|\.git|Base/|logs/|uploads/)')) {
                $remotePath = "$VPS_PATH/$f"
                $remoteDir = Split-Path $remotePath -Parent
                # Create remote directory if needed
                ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_HOST "mkdir -p '$remoteDir'" 2>$null
                scp -i $SSH_KEY -o StrictHostKeyChecking=no "$localPath" "${VPS_HOST}:${remotePath}" 2>$null
                if ($LASTEXITCODE -eq 0) { $uploaded++ }
            }
        }
        Write-OK "$uploaded arquivos enviados para VPS"

        # Restart PM2
        Write-Step "♻️" "Reiniciando PM2"
        ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_HOST "cd $VPS_PATH && pm2 restart aluforce-v2-production --update-env && pm2 save" 2>$null
        if ($LASTEXITCODE -eq 0) { Write-OK "PM2 reiniciado com sucesso" }
        else { Write-Err "Erro ao reiniciar PM2" }
    } else {
        Write-Warn "Nenhum arquivo alterado para enviar"
    }
}

Write-Host "`n═══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  Deploy concluído! 🎉" -ForegroundColor Green
Write-Host "═══════════════════════════════════════`n" -ForegroundColor DarkGray
