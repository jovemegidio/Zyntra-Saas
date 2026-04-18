# Deploy batch de todos os HTMLs modificados no commit local vs HEAD
# Uso: powershell -ExecutionPolicy Bypass -File deploy-batch.ps1

$VPS_HOST = "root@31.97.64.102"
$VPS_PATH = "/var/www/aluforce"
$LOCAL    = "G:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra"
$SSH_KEY  = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$SSH_OPTS = @("-i", $SSH_KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15")

# Lista de todos os HTML modificados em modules/ (obtido via git diff)
$files = @(
  "modules\Admin\public\pages\permissoes.html",
  "modules\Compras\cotacoes.html",
  "modules\Compras\fornecedores.html",
  "modules\Compras\gestao-estoque.html",
  "modules\Compras\index.html",
  "modules\Compras\pedidos.html",
  "modules\Compras\public\index.html",
  "modules\Compras\qrcode-estoque.html",
  "modules\Compras\recebimento.html",
  "modules\Compras\relatorios.html",
  "modules\Compras\requisicoes.html",
  "modules\Faturamento\public\consultar.html",
  "modules\Faturamento\public\dashboard.html",
  "modules\Faturamento\public\eventos.html",
  "modules\Faturamento\public\index.html",
  "modules\Faturamento\public\inutilizacao.html",
  "modules\Faturamento\public\relatorios.html",
  "modules\Financeiro\public\conciliacao.html",
  "modules\Financeiro\public\contas_bancarias.html",
  "modules\Financeiro\public\contas_pagar.html",
  "modules\Financeiro\public\contas_receber.html",
  "modules\Financeiro\public\fluxo_caixa.html",
  "modules\Financeiro\public\impostos.html",
  "modules\Financeiro\public\index.html",
  "modules\Financeiro\public\orcamentos.html",
  "modules\Financeiro\public\plano_contas.html",
  "modules\Financeiro\public\relatorios.html",
  "modules\Logistica\public\index.html",
  "modules\NFe\consultar.html",
  "modules\NFe\danfe.html",
  "modules\NFe\emitir.html",
  "modules\NFe\eventos.html",
  "modules\NFe\index.html",
  "modules\NFe\inutilizacao.html",
  "modules\NFe\logistica.html",
  "modules\NFe\nfse.html",
  "modules\NFe\relatorios.html",
  "modules\PCP\apontamentos.html",
  "modules\PCP\index.html",
  "modules\PCP\ordens-producao.html",
  "modules\PCP\relatorios-apontamentos.html",
  "modules\PCP\pages\estoque.html",
  "modules\PCP\pages\faturamento.html",
  "modules\PCP\pages\gestao-producao.html",
  "modules\PCP\pages\materiais.html",
  "modules\PCP\pages\qualidade.html",
  "modules\PCP\pages\relatorios.html",
  "modules\RH\public\areaadm.html",
  "modules\RH\public\dados-pessoais.html",
  "modules\RH\public\funcionario.html",
  "modules\RH\public\gestao-holerites.html",
  "modules\RH\public\pages\beneficios.html",
  "modules\RH\public\pages\calendario-rh.html",
  "modules\RH\public\pages\dados-cadastrais.html",
  "modules\RH\public\pages\dashboard.html",
  "modules\RH\public\pages\folha.html",
  "modules\RH\public\pages\funcionarios.html",
  "modules\RH\public\pages\gestao-ponto.html",
  "modules\RH\public\pages\gestao-solicitacoes.html",
  "modules\RH\public\pages\holerites.html",
  "modules\RH\public\pages\meus-holerites.html",
  "modules\RH\public\pages\ponto.html",
  "modules\RH\public\pages\relatorios.html",
  "modules\RH\public\solicitacoes.html",
  "modules\RH\public\treinamentos.html",
  "modules\Vendas\public\clientes.html",
  "modules\Vendas\public\comissoes.html",
  "modules\Vendas\public\cte.html",
  "modules\Vendas\public\dashboard-admin.html",
  "modules\Vendas\public\dashboard.html",
  "modules\Vendas\public\estoque.html",
  "modules\Vendas\public\index.html",
  "modules\Vendas\public\pedidos.html",
  "modules\Vendas\public\prospeccao.html",
  "modules\Vendas\public\relatorios.html",
  "modules\_shared\aluforce-layout.html"
)

$ok  = 0
$err = 0
$skip = 0

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Deploy Batch - $($files.Count) arquivos HTML  " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($f in $files) {
    $full = Join-Path $LOCAL $f
    if (-not (Test-Path $full)) {
        Write-Host "  SKIP (nao existe): $f" -ForegroundColor Gray
        $skip++
        continue
    }

    $rel = $f -replace "\\", "/"
    $dir = ($rel | Split-Path -Parent) -replace "\\", "/"

    if ($dir) {
        ssh @SSH_OPTS $VPS_HOST "mkdir -p $VPS_PATH/$dir" 2>$null
    }

    Write-Host "  -> $rel" -NoNewline -ForegroundColor Yellow
    scp @SSH_OPTS "$full" "${VPS_HOST}:${VPS_PATH}/${rel}" 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
        $ok++
    } else {
        Write-Host " [ERRO]" -ForegroundColor Red
        $err++
    }
}

Write-Host ""
Write-Host "-------------------------------------------" -ForegroundColor DarkGray
Write-Host "Resultado: $ok enviados, $err erros, $skip ignorados" -ForegroundColor $(if ($err -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Reiniciando PM2..." -ForegroundColor Cyan
ssh @SSH_OPTS $VPS_HOST "pm2 restart aluforce-v2-production --update-env && pm2 save"
Write-Host "PM2 reiniciado!" -ForegroundColor Green
