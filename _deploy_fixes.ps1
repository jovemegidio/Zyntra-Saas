$key = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$vps = "root@31.97.64.102"
$scp = "C:\Windows\System32\OpenSSH\scp.exe"
$ssh = "C:\Windows\System32\OpenSSH\ssh.exe"
$base = $PSScriptRoot

$files = @(
    @{ src = "modules\RH\index.html";                           dst = "/var/www/aluforce/modules/RH/index.html" },
    @{ src = "modules\RH\public\pages\funcionarios.html";       dst = "/var/www/aluforce/modules/RH/public/pages/funcionarios.html" },
    @{ src = "modules\Logistica\public\index.html";             dst = "/var/www/aluforce/modules/Logistica/public/index.html" },
    @{ src = "modules\PCP\ordens-producao.html";                dst = "/var/www/aluforce/modules/PCP/ordens-producao.html" },
    @{ src = "modules\Vendas\public\index.html";                dst = "/var/www/aluforce/modules/Vendas/public/index.html" },
    @{ src = "modules\Vendas\public\relatorios.html";           dst = "/var/www/aluforce/modules/Vendas/public/relatorios.html" },
    @{ src = "modules\Vendas\server.js";                        dst = "/var/www/aluforce/modules/Vendas/server.js" }
)

Write-Host "=== Uploading to aluforce ===" -ForegroundColor Cyan
foreach ($f in $files) {
    $src = Join-Path $base $f.src
    Write-Host "  -> $($f.src)" -NoNewline
    & $scp -o StrictHostKeyChecking=no -i "$key" "$src" "${vps}:$($f.dst)"
    if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " FAIL ($LASTEXITCODE)" -ForegroundColor Red }
}

# Labor Eletric
$filesLE = @(
    @{ src = "modules\RH\index.html";                           dst = "/var/www/labor-eletric/modules/RH/index.html" },
    @{ src = "modules\RH\public\pages\funcionarios.html";       dst = "/var/www/labor-eletric/modules/RH/public/pages/funcionarios.html" },
    @{ src = "modules\Logistica\public\index.html";             dst = "/var/www/labor-eletric/modules/Logistica/public/index.html" },
    @{ src = "modules\PCP\ordens-producao.html";                dst = "/var/www/labor-eletric/modules/PCP/ordens-producao.html" },
    @{ src = "modules\Vendas\public\index.html";                dst = "/var/www/labor-eletric/modules/Vendas/public/index.html" },
    @{ src = "modules\Vendas\public\relatorios.html";           dst = "/var/www/labor-eletric/modules/Vendas/public/relatorios.html" },
    @{ src = "modules\Vendas\server.js";                        dst = "/var/www/labor-eletric/modules/Vendas/server.js" }
)

Write-Host "=== Uploading to labor-eletric ===" -ForegroundColor Cyan
foreach ($f in $filesLE) {
    $src = Join-Path $base $f.src
    Write-Host "  -> $($f.src)" -NoNewline
    & $scp -o StrictHostKeyChecking=no -i "$key" "$src" "${vps}:$($f.dst)"
    if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " FAIL ($LASTEXITCODE)" -ForegroundColor Red }
}

# Labor Energy
$filesLEn = @(
    @{ src = "modules\RH\index.html";                           dst = "/var/www/labor-energy/modules/RH/index.html" },
    @{ src = "modules\RH\public\pages\funcionarios.html";       dst = "/var/www/labor-energy/modules/RH/public/pages/funcionarios.html" },
    @{ src = "modules\Logistica\public\index.html";             dst = "/var/www/labor-energy/modules/Logistica/public/index.html" },
    @{ src = "modules\PCP\ordens-producao.html";                dst = "/var/www/labor-energy/modules/PCP/ordens-producao.html" },
    @{ src = "modules\Vendas\public\index.html";                dst = "/var/www/labor-energy/modules/Vendas/public/index.html" },
    @{ src = "modules\Vendas\public\relatorios.html";           dst = "/var/www/labor-energy/modules/Vendas/public/relatorios.html" },
    @{ src = "modules\Vendas\server.js";                        dst = "/var/www/labor-energy/modules/Vendas/server.js" }
)

Write-Host "=== Uploading to labor-energy ===" -ForegroundColor Cyan
foreach ($f in $filesLEn) {
    $src = Join-Path $base $f.src
    Write-Host "  -> $($f.src)" -NoNewline
    & $scp -o StrictHostKeyChecking=no -i "$key" "$src" "${vps}:$($f.dst)"
    if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " FAIL ($LASTEXITCODE)" -ForegroundColor Red }
}

Write-Host "=== PM2 Restart ===" -ForegroundColor Cyan
& $ssh -o StrictHostKeyChecking=no -i "$key" $vps "pm2 restart aluforce-v2-production labor-eletric-demo labor-energy-demo"
Write-Host "PM2 Exit: $LASTEXITCODE"
