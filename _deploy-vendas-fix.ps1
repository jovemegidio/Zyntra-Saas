$ErrorActionPreference = 'Stop'
$src = "modules\Vendas\public"
$dest = "root@31.97.64.102:/var/www/aluforce/modules/Vendas/public"

Write-Host "=== Uploading index.html ===" -ForegroundColor Cyan
scp "$src\index.html" "${dest}/index.html"
if ($LASTEXITCODE -ne 0) { Write-Host "FALHA no upload de index.html" -ForegroundColor Red; exit 1 }

Write-Host "=== Uploading prospeccao.html ===" -ForegroundColor Cyan
scp "$src\prospeccao.html" "${dest}/prospeccao.html"
if ($LASTEXITCODE -ne 0) { Write-Host "FALHA no upload de prospeccao.html" -ForegroundColor Red; exit 1 }

Write-Host "=== PM2 Reload ===" -ForegroundColor Cyan
ssh -o StrictHostKeyChecking=no root@31.97.64.102 'cd /var/www/aluforce && pm2 reload 1 --update-env'
if ($LASTEXITCODE -ne 0) { Write-Host "FALHA no PM2 reload" -ForegroundColor Red; exit 1 }

Write-Host "=== Verificando deploy ===" -ForegroundColor Cyan
ssh -o StrictHostKeyChecking=no root@31.97.64.102 'sleep 2 && curl -sI http://localhost:3000/Vendas/index.html | head -3 && echo --- && curl -sI http://localhost:3000/Vendas/prospeccao.html | head -3'

Write-Host ""
Write-Host "=== DEPLOY CONCLUIDO ===" -ForegroundColor Green
