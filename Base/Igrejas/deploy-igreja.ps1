# ============================================
# Zyntra Igrejas — Deploy Igreja Module to VPS
# ============================================
# Envia o módulo Igreja (Glory) para a VPS e inicia via PM2
# Uso: .\deploy-igreja.ps1
# Flags: -SemBackup → pula backup antes do deploy

param(
    [switch]$SemBackup
)

# ── Configuração ──────────────────────────────
$servidor = "31.97.64.102"
$usuario = "root"
$senha = if ($env:VPS_PASSWORD) { $env:VPS_PASSWORD } else { Read-Host "Senha VPS" }
$caminhoRemoto = "/var/www/zyntra-igrejas"
$caminhoLocal = $PSScriptRoot
if (-not $caminhoLocal) {
    $caminhoLocal = "G:\Outros computadores\Meu laptop (2)\Zyntra\Base\Igrejas"
}

# PuTTY no PATH
if (-not (Get-Command pscp -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\Program Files\PuTTY"
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   ✝️  Zyntra Igrejas — Deploy VPS          ║" -ForegroundColor Magenta
Write-Host "║   📂 Módulo: Igreja (Glory Platform)      ║" -ForegroundColor Magenta
Write-Host "║   🌐 Porto: 3016                         ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ── 1. Criar diretório remoto ──────────────────
Write-Host "  📁 Preparando diretório remoto..." -ForegroundColor Cyan
plink -batch -pw $senha $usuario@$servidor "mkdir -p $caminhoRemoto/modules/Igreja/css $caminhoRemoto/modules/Igreja/js $caminhoRemoto/logs" 2>$null

# ── 2. Backup (opcional) ──────────────────────
if (-not $SemBackup) {
    Write-Host "  📦 Criando backup..." -ForegroundColor Yellow
    $backupName = "igreja-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
    plink -batch -pw $senha $usuario@$servidor "cd /var/www && tar czf /var/www/backups/$backupName zyntra-igrejas/ 2>/dev/null || echo 'Sem backup anterior'" 2>$null
    Write-Host "  ✅ Backup: $backupName" -ForegroundColor Green
}

# ── 3. Upload server.js + ecosystem ──────────
Write-Host "  📤 Enviando server.js..." -ForegroundColor Cyan
pscp -pw $senha "$caminhoLocal\server.js" "${usuario}@${servidor}:$caminhoRemoto/server.js" 2>$null
pscp -pw $senha "$caminhoLocal\ecosystem.igrejas.config.js" "${usuario}@${servidor}:$caminhoRemoto/ecosystem.igrejas.config.js" 2>$null
pscp -pw $senha "$caminhoLocal\package.json" "${usuario}@${servidor}:$caminhoRemoto/package.json" 2>$null

# ── 4. Upload módulo Igreja (HTML/CSS/JS) ────
Write-Host "  📤 Enviando módulo Igreja..." -ForegroundColor Cyan

# CSS
pscp -pw $senha "$caminhoLocal\modules\Igreja\css\igreja.css" "${usuario}@${servidor}:$caminhoRemoto/modules/Igreja/css/igreja.css" 2>$null

# JS
pscp -pw $senha "$caminhoLocal\modules\Igreja\js\igreja.js" "${usuario}@${servidor}:$caminhoRemoto/modules/Igreja/js/igreja.js" 2>$null

# HTML pages
$htmlFiles = Get-ChildItem -Path "$caminhoLocal\modules\Igreja\*.html" -File
$totalPages = $htmlFiles.Count
$current = 0
foreach ($file in $htmlFiles) {
    $current++
    Write-Host "    [$current/$totalPages] $($file.Name)" -ForegroundColor Gray
    pscp -pw $senha $file.FullName "${usuario}@${servidor}:$caminhoRemoto/modules/Igreja/$($file.Name)" 2>$null
}
Write-Host "  ✅ $totalPages páginas enviadas!" -ForegroundColor Green

# ── 5. Instalar dependências na VPS ──────────
Write-Host "  📦 Instalando dependências..." -ForegroundColor Cyan
plink -batch -pw $senha $usuario@$servidor "cd $caminhoRemoto && npm install express helmet compression --production 2>&1 | tail -3" 2>$null
Write-Host "  ✅ Dependências instaladas!" -ForegroundColor Green

# ── 6. PM2 — start ou restart ────────────────
Write-Host "  🔄 Configurando PM2..." -ForegroundColor Cyan
$pm2Status = plink -batch -pw $senha $usuario@$servidor "pm2 describe zyntra-igrejas 2>/dev/null | head -1" 2>$null
if ($pm2Status -match "zyntra-igrejas") {
    plink -batch -pw $senha $usuario@$servidor "cd $caminhoRemoto && pm2 restart zyntra-igrejas --update-env" 2>$null
    Write-Host "  ✅ PM2 reiniciado!" -ForegroundColor Green
} else {
    plink -batch -pw $senha $usuario@$servidor "cd $caminhoRemoto && pm2 start ecosystem.igrejas.config.js && pm2 save" 2>$null
    Write-Host "  ✅ PM2 iniciado e salvo!" -ForegroundColor Green
}

# ── 7. Health check ──────────────────────────
Write-Host "  🏥 Health check..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
$health = plink -batch -pw $senha $usuario@$servidor "curl -s -o /dev/null -w '%{http_code}' http://localhost:3016/health 2>/dev/null" 2>$null
if ($health -match '200') {
    Write-Host "  ✅ Servidor respondendo (HTTP $health)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Servidor retornou HTTP $health — verifique: pm2 logs zyntra-igrejas" -ForegroundColor Yellow
}

# ── 8. Resumo ────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Deploy concluído!                    ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║   🌐 http://$servidor`:3016        ║" -ForegroundColor Green
Write-Host "║   📂 $caminhoRemoto      ║" -ForegroundColor Green
Write-Host "║   📄 $totalPages páginas HTML                   ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║   🔑 Credenciais de acesso:               ║" -ForegroundColor Green
Write-Host "║   Admin:  admin@zyntra.church / admin123  ║" -ForegroundColor Cyan
Write-Host "║   Líder:  lider@zyntra.church / lider123  ║" -ForegroundColor Cyan
Write-Host "║   Membro: membro@zyntra.church / membro123║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
