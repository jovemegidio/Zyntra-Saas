# Teste de Login para Usuários PCP
# Usuários: Andreia, Douglas e Guilherme

Write-Host "🧪 Teste de Login - Usuários PCP Específicos" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host "📅 Data: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host "🎯 Objetivo: Testar login dos usuários Andreia, Douglas e Guilherme" -ForegroundColor Gray
Write-Host ""

$usuarios = @(
    @{ nome = "Andreia"; email = "andreia@aluforce.ind.br"; senha = "123456" },
    @{ nome = "Douglas"; email = "douglas@aluforce.ind.br"; senha = "123456" },
    @{ nome = "Guilherme"; email = "guilherme@aluforce.ind.br"; senha = "123456" }
)

Write-Host "👥 Usuários a serem testados:" -ForegroundColor Yellow
for ($i = 0; $i -lt $usuarios.Count; $i++) {
    Write-Host "  $($i + 1). $($usuarios[$i].nome) ($($usuarios[$i].email))" -ForegroundColor White
}
Write-Host ""

$sucessos = 0
$falhas = 0

foreach ($usuario in $usuarios) {
    Write-Host "🔐 Testando login de $($usuario.nome)..." -ForegroundColor Blue
    
    try {
        $body = @{
            identifier = $usuario.email
            password = $usuario.senha
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri 'http://localhost:3001/login' -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
        
        Write-Host "✅ $($usuario.nome): LOGIN REALIZADO COM SUCESSO" -ForegroundColor Green
        Write-Host "   📧 Email: $($usuario.email)" -ForegroundColor Gray
        Write-Host "   👤 Nome no sistema: $($response.nome)" -ForegroundColor Gray
        Write-Host "   🆔 ID: $($response.id)" -ForegroundColor Gray
        if ($response.setor) { Write-Host "   🏢 Setor: $($response.setor)" -ForegroundColor Gray }
        if ($response.permissoes) { Write-Host "   🔑 Permissões: $($response.permissoes)" -ForegroundColor Gray }
        
        $sucessos++
    }
    catch {
        Write-Host "❌ $($usuario.nome): FALHA NO LOGIN" -ForegroundColor Red
        Write-Host "   📧 Email: $($usuario.email)" -ForegroundColor Gray
        Write-Host "   ⚠️  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
        
        $falhas++
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
}

# Resumo final
Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Magenta
Write-Host "=" * 30 -ForegroundColor Gray
Write-Host "✅ Sucessos: $sucessos" -ForegroundColor Green
Write-Host "❌ Falhas: $falhas" -ForegroundColor Red
$taxaSucesso = if ($usuarios.Count -gt 0) { ($sucessos / $usuarios.Count) * 100 } else { 0 }
Write-Host "📈 Taxa de sucesso: $($taxaSucesso.ToString('F1'))%" -ForegroundColor Cyan

if ($sucessos -eq $usuarios.Count) {
    Write-Host ""
    Write-Host "🎉 TODOS OS USUÁRIOS FORAM AUTENTICADOS COM SUCESSO!" -ForegroundColor Green
    Write-Host "✅ O sistema PCP está funcionando corretamente para os usuários solicitados." -ForegroundColor Green
} elseif ($sucessos -gt 0) {
    Write-Host ""
    Write-Host "⚠️  ALGUNS USUÁRIOS FALHARAM NA AUTENTICAÇÃO" -ForegroundColor Yellow
    Write-Host "🔧 Verifique as credenciais dos usuários com falha." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ NENHUM USUÁRIO FOI AUTENTICADO" -ForegroundColor Red
    Write-Host "🚨 Verifique se o servidor está funcionando e as credenciais estão corretas." -ForegroundColor Red
}

Write-Host ""
Write-Host "🔚 Teste concluído!" -ForegroundColor Cyan