# Teste de Login para Usuarios PCP
Write-Host "Teste de Login - Usuarios PCP Especificos" -ForegroundColor Cyan
Write-Host "Data: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host "Objetivo: Testar login dos usuarios Andreia, Douglas, Guilherme e TI" -ForegroundColor Gray
Write-Host ""

$usuarios = @(
    @{ nome = "Andreia"; email = "andreia@aluforce.ind.br"; senha = "123456" },
    @{ nome = "Douglas"; email = "douglas@aluforce.ind.br"; senha = "123456" },
    @{ nome = "Guilherme"; email = "guilherme@aluforce.ind.br"; senha = "123456" },
    @{ nome = "TI"; email = "ti@aluforce.ind.br"; senha = "123456" }
)

Write-Host "Usuarios a serem testados:" -ForegroundColor Yellow
for ($i = 0; $i -lt $usuarios.Count; $i++) {
    Write-Host "  $($i + 1). $($usuarios[$i].nome) ($($usuarios[$i].email))" -ForegroundColor White
}
Write-Host ""

$sucessos = 0
$falhas = 0

foreach ($usuario in $usuarios) {
    Write-Host "Testando login de $($usuario.nome)..." -ForegroundColor Blue
    
    try {
        $body = @{
            identifier = $usuario.email
            password = $usuario.senha
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri 'http://localhost:3001/login' -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
        
        Write-Host "SUCESSO: $($usuario.nome) autenticado!" -ForegroundColor Green
        Write-Host "  Email: $($usuario.email)" -ForegroundColor Gray
        Write-Host "  Nome: $($response.nome)" -ForegroundColor Gray
        Write-Host "  ID: $($response.id)" -ForegroundColor Gray
        
        $sucessos++
    }
    catch {
        Write-Host "FALHA: $($usuario.nome) nao autenticado" -ForegroundColor Red
        Write-Host "  Email: $($usuario.email)" -ForegroundColor Gray
        Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Yellow
        
        $falhas++
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
}

# Resumo final
Write-Host "RESUMO DOS TESTES" -ForegroundColor Magenta
Write-Host "Sucessos: $sucessos" -ForegroundColor Green
Write-Host "Falhas: $falhas" -ForegroundColor Red
$taxaSucesso = if ($usuarios.Count -gt 0) { ($sucessos / $usuarios.Count) * 100 } else { 0 }
Write-Host "Taxa de sucesso: $($taxaSucesso.ToString('F1'))%" -ForegroundColor Cyan

if ($sucessos -eq $usuarios.Count) {
    Write-Host ""
    Write-Host "TODOS OS USUARIOS FORAM AUTENTICADOS COM SUCESSO!" -ForegroundColor Green
} elseif ($sucessos -gt 0) {
    Write-Host ""
    Write-Host "ALGUNS USUARIOS FALHARAM NA AUTENTICACAO" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "NENHUM USUARIO FOI AUTENTICADO" -ForegroundColor Red
}

Write-Host ""
Write-Host "Teste concluido!" -ForegroundColor Cyan