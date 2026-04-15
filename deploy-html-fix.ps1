$k = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$vps = "root@31.97.64.102"
$b = "G:\Outros computadores\Meu laptop (2)\Zyntra"

$files = @(
    "modules/RH/public/treinamentos.html",
    "modules/Consultoria/acesso.html",
    "modules/Vendas/public/index_utf8.html",
    "modules/Vendas/public/cte.html",
    "modules/Vendas/public/estoque.html",
    "modules/Vendas/public/prospeccao.html",
    "modules/Vendas/public/dashboard.html",
    "modules/Vendas/public/clientes.html",
    "modules/Vendas/public/comissoes.html",
    "modules/Vendas/public/pedidos.html",
    "modules/Vendas/public/dashboard-admin.html",
    "modules/Vendas/public/relatorios.html",
    "modules/Financeiro/relatorios.html",
    "modules/Financeiro/fluxo-caixa.html",
    "modules/Financeiro/plano-contas.html",
    "modules/Financeiro/centros-custo.html",
    "modules/Financeiro/conciliacao.html",
    "modules/Financeiro/orcamentos.html",
    "modules/Financeiro/impostos.html",
    "modules/Financeiro/bancos.html",
    "modules/Financeiro/recorrencias.html",
    "modules/Financeiro/nfse.html",
    "modules/Financeiro/boletos.html",
    "modules/Financeiro/contas-receber.html",
    "modules/Financeiro/contas-pagar.html",
    "modules/Financeiro/public/index.html",
    "modules/Admin/public/pages/permissoes.html"
)

$count = 0
foreach ($f in $files) {
    $local = Join-Path $b ($f.Replace("/","\"))
    $remote = "/var/www/aluforce/$f"
    scp -i $k $local "${vps}:${remote}" 2>&1 | Out-Null
    $count++
    Write-Host "$count/$($files.Count) $f"
}

# Also upload to Labor Eletric and Labor Energy
$keyFiles = @(
    "routes/danfe-renderer.js",
    "routes/vendas-routes.js",
    "modules/Faturamento/api/faturamento.js",
    "modules/Vendas/public/index.html"
)

foreach ($site in @("labor-eletric", "labor-energy")) {
    foreach ($f in $keyFiles) {
        $local = Join-Path $b ($f.Replace("/","\"))
        $remote = "/var/www/$site/$f"
        scp -i $k $local "${vps}:${remote}" 2>&1 | Out-Null
    }
    Write-Host "Done: $site"
}

Write-Host "All files uploaded!"
