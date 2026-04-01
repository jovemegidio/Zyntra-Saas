# Deploy Modal Visual Update - All CSS/HTML/JS changes to VPS
$ErrorActionPreference = "Continue"
$VPS = "root@31.97.64.102"
$KEY = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$OPTS = @("-i", $KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=30")
$LOCAL = "G:\Outros computadores\Meu laptop (2)\Zyntra"
$REMOTE = "/var/www/aluforce"

Write-Host "=== DEPLOY MODAL VISUAL UPDATE ===" -ForegroundColor Cyan
Write-Host ""

$ok = 0; $err = 0

function Deploy($rel) {
    $src = Join-Path $LOCAL ($rel -replace '/','\')
    if (-not (Test-Path $src)) { Write-Host "SKIP: $rel (not found)" -ForegroundColor Yellow; return }
    $dir = ($rel | Split-Path -Parent) -replace '\\','/'
    if ($dir) { ssh @OPTS $VPS "mkdir -p $REMOTE/$dir" 2>$null }
    scp @OPTS $src "${VPS}:${REMOTE}/${rel}" 2>$null
    if ($LASTEXITCODE -eq 0) { 
        Write-Host "  OK: $rel" -ForegroundColor Green
        $script:ok++
    } else { 
        Write-Host "  ERR: $rel" -ForegroundColor Red
        $script:err++
    }
}

# 1. Critical CSS files
Write-Host "--- CSS Files ---" -ForegroundColor Yellow
$cssFiles = @(
    "public/css/modal-standard-compat.css",
    "public/css/modal-unified.css",
    "public/css/modal-configuracoes.css",
    "public/css/modal-configuracoes-v2.css",
    "public/css/modal-configuracoes-v3.css",
    "public/css/modal-configuracoes-v4.css",
    "public/css/modal-fix-global.css",
    "public/css/fluid-animations.css",
    "public/css/cards-solid.css",
    "public/css/config-modals-professional.css",
    "public/css/config-modals.css",
    "public/css/dashboard-enhanced.css",
    "public/css/dashboard-saas-v2.css",
    "public/css/modern-saas.css",
    "public/css/notifications-panel.css",
    "public/css/pcp_modern_clean.css",
    "public/css/profile-modal-modern.css",
    "public/css/realtime-sync.css",
    "public/css/style-modules.css",
    "public/css/style-enhanced.css",
    "public/css/tooltips-professional.css"
)
foreach ($f in $cssFiles) { Deploy $f }

# 2. Critical JS files
Write-Host "`n--- JS Files ---" -ForegroundColor Yellow
$jsFiles = @(
    "public/js/action-notifications.js",
    "public/js/confirm-modal.js",
    "public/js/pwa-manager.js",
    "public/js/app-mobile-config.js",
    "public/js/company-settings.js",
    "public/js/compras-completo.js",
    "public/js/toast-modal-system.js",
    "public/js/vendas-completo.js",
    "public/js/aluforce-fluid-ui.js",
    "public/js/offline-sync-manager.js",
    "public/js/notification-manager.js",
    "public/js/modal-integration.js",
    "public/js/header-controls.js",
    "public/js/espelho-nf.js",
    "public/js/config-modals.js"
)
foreach ($f in $jsFiles) { Deploy $f }

# 3. Public HTML
Write-Host "`n--- Public HTML ---" -ForegroundColor Yellow
Deploy "public/index.html"
Deploy "public/config.html"
Deploy "public/config-modals.html"
Deploy "public/config-modals-extended.html"

# 4. Financeiro module
Write-Host "`n--- Financeiro ---" -ForegroundColor Yellow
$finFiles = @(
    "modules/Financeiro/contas-receber.html",
    "modules/Financeiro/contas-pagar.html",
    "modules/Financeiro/bancos.html",
    "modules/Financeiro/orcamentos.html",
    "modules/Financeiro/plano-contas.html"
)
foreach ($f in $finFiles) { Deploy $f }

# 5. Vendas module
Write-Host "`n--- Vendas ---" -ForegroundColor Yellow
Deploy "modules/Vendas/public/index_utf8.html"

# 6. Other key modules - get all HTML files
Write-Host "`n--- Other Modules ---" -ForegroundColor Yellow
$modDirs = @("Compras","RH","PCP","Estoque","Logistica","Fiscal","Contabilidade")
foreach ($m in $modDirs) {
    $dir = Join-Path $LOCAL "modules\$m"
    if (Test-Path $dir) {
        Get-ChildItem $dir -Filter "*.html" -ErrorAction SilentlyContinue | ForEach-Object {
            $rel = "modules/$m/$($_.Name)"
            Deploy $rel
        }
        Get-ChildItem $dir -Filter "*.js" -ErrorAction SilentlyContinue | ForEach-Object {
            $rel = "modules/$m/$($_.Name)"
            Deploy $rel
        }
        # Also deploy from public/ subdir if exists
        $pubDir = Join-Path $dir "public"
        if (Test-Path $pubDir) {
            Get-ChildItem $pubDir -Include "*.html","*.js","*.css" -ErrorAction SilentlyContinue | ForEach-Object {
                $rel = "modules/$m/public/$($_.Name)"
                Deploy $rel
            }
        }
        # Deploy css/ subdir if exists
        $cssDir = Join-Path $dir "css"
        if (Test-Path $cssDir) {
            Get-ChildItem $cssDir -Filter "*.css" -ErrorAction SilentlyContinue | ForEach-Object {
                $rel = "modules/$m/css/$($_.Name)"
                Deploy $rel
            }
        }
    }
}

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "Result: $ok deployed, $err errors" -ForegroundColor $(if ($err -eq 0) { "Green" } else { "Yellow" })

# Restart PM2
Write-Host "`nRestarting PM2..." -ForegroundColor Cyan
ssh @OPTS $VPS "pm2 restart aluforce-dashboard --update-env && pm2 save" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "PM2 restarted successfully!" -ForegroundColor Green
} else {
    Write-Host "PM2 restart failed" -ForegroundColor Red
}
