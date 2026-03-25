$ErrorActionPreference = "Continue"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$servidor = "31.97.64.102"
$usuario = "root"
$senha = "Aluforce@2026#Vps"
$remoto = "/var/www/aluforce"
$local = "G:\Outros computadores\Meu laptop (2)\Zyntra"

# Arquivos para deploy
$arquivos = @(
    @{ local = "$local\routes\vendas-routes.js"; remote = "$remoto/routes/vendas-routes.js" },
    @{ local = "$local\routes\misc-routes.js"; remote = "$remoto/routes/misc-routes.js" },
    @{ local = "$local\modules\Vendas\server.js"; remote = "$remoto/modules/Vendas/server.js" },
    @{ local = "$local\modules\Vendas\public\index.html"; remote = "$remoto/modules/Vendas/public/index.html" }
)

Write-Host "=== DEPLOY: Fix Autocomplete Produtos ===" -ForegroundColor Cyan
Write-Host ""

# Tentar PuTTY primeiro, depois OpenSSH
$puttyPath = $null
if (Test-Path "C:\Program Files\PuTTY\pscp.exe") { $puttyPath = "C:\Program Files\PuTTY" }
elseif (Test-Path "C:\Program Files (x86)\PuTTY\pscp.exe") { $puttyPath = "C:\Program Files (x86)\PuTTY" }

if ($puttyPath) {
    Write-Host "Usando PuTTY..." -ForegroundColor Yellow
    foreach ($arq in $arquivos) {
        Write-Host "  Enviando: $($arq.local | Split-Path -Leaf)" -NoNewline
        & "$puttyPath\pscp.exe" -batch -pw $senha -q $arq.local "${usuario}@${servidor}:$($arq.remote)" 2>$null
        if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green } 
        else { Write-Host " ERRO" -ForegroundColor Red }
    }
    
    Write-Host ""
    Write-Host "Reiniciando PM2..." -ForegroundColor Yellow
    & "$puttyPath\plink.exe" -batch -pw $senha "${usuario}@${servidor}" "pm2 restart aluforce-dashboard --update-env 2>&1 || pm2 restart all 2>&1"
} else {
    Write-Host "PuTTY nao encontrado. Usando sshpass/OpenSSH..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute manualmente:" -ForegroundColor Red
    foreach ($arq in $arquivos) {
        $rel = ($arq.local).Replace($local + "\", "").Replace("\", "/")
        Write-Host "  scp `"$($arq.local)`" ${usuario}@${servidor}:$($arq.remote)"
    }
    Write-Host "  ssh ${usuario}@${servidor} `"pm2 restart aluforce-dashboard --update-env`""
}

Write-Host ""
Write-Host "=== DEPLOY CONCLUIDO ===" -ForegroundColor Green
