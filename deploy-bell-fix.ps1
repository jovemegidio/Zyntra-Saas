$SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$VPS = "root@31.97.64.102"
$LOCAL = "G:\Outros computadores\Meu laptop (2)\Zyntra"
$REMOTE = "/var/www/aluforce"

$files = @(
    "modules/PCP/pages/qualidade.html",
    "modules/PCP/pages/materiais.html",
    "modules/PCP/pages/estoque.html",
    "modules/PCP/pages/ordem-compra.html",
    "modules/PCP/pages/gestao-producao.html",
    "modules/PCP/pages/relatorios.html",
    "modules/Financeiro/index.html",
    "modules/Financeiro/bancos.html",
    "modules/Financeiro/contas-pagar.html",
    "modules/Financeiro/contas-receber.html",
    "modules/Financeiro/fluxo-caixa.html",
    "modules/Financeiro/plano-contas.html",
    "modules/Financeiro/centros-custo.html",
    "modules/Financeiro/conciliacao.html",
    "modules/Financeiro/impostos.html",
    "modules/Financeiro/orcamentos.html",
    "modules/Financeiro/relatorios.html",
    "modules/Financeiro/dashboard-contas-pagar.html",
    "modules/Financeiro/dashboard-contas-receber.html",
    "modules/Financeiro/public/index.html",
    "modules/Vendas/public/pedidos.html",
    "modules/Vendas/public/prospeccao.html",
    "modules/Vendas/public/dashboard.html",
    "modules/Vendas/public/dashboard-admin.html",
    "modules/Vendas/public/relatorios.html",
    "modules/Vendas/public/clientes.html",
    "modules/NFe/index.html",
    "modules/NFe/inutilizacao.html",
    "modules/NFe/eventos.html",
    "modules/NFe/relatorios.html",
    "modules/NFe/consultar.html",
    "modules/NFe/danfe.html",
    "modules/NFe/nfse.html",
    "modules/NFe/emitir.html",
    "modules/Compras/gestao-estoque.html",
    "modules/Compras/pedidos.html",
    "modules/Compras/relatorios.html",
    "modules/Compras/requisicoes.html",
    "modules/Compras/fornecedores.html",
    "modules/Compras/cotacoes.html",
    "modules/RH/public/funcionario.html",
    "modules/RH/public/pages/dashboard.html",
    "modules/Consultoria/acesso.html",
    "modules/_shared/header-sidebar.html",
    "modules/_shared/header.html",
    "modules/_shared/demo-layout.html",
    "modules/_shared/aluforce-layout.html"
)

$ok = 0; $fail = 0
foreach ($f in $files) {
    $src = Join-Path $LOCAL $f
    $dst = "$REMOTE/$f"
    if (!(Test-Path $src)) { Write-Host "SKIP: $f"; continue }
    $result = scp -i $SSH_KEY -o StrictHostKeyChecking=no $src "${VPS}:${dst}" 2>&1
    if ($LASTEXITCODE -eq 0) { $ok++; Write-Host "OK: $f" } else { $fail++; Write-Host "FAIL: $f - $result" }
}
Write-Host "`n=== $ok OK, $fail FAIL ==="
