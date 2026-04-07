# Para desenvolvimento: para processos Node que ocupam a porta 3001, libera e inicia npm run dev
$port = 3001
Write-Host "Procurando processos escutando na porta $port..."
# Get TCP listeners and extract PID(s)
$listeners = netstat -ano | Select-String ":$port " | ForEach-Object { $_.ToString().Trim() }
if (-not $listeners) {
    Write-Host "Nenhum listener encontrado na porta $port"
} else {
    $procIds = $listeners -replace '\s+', ' ' | ForEach-Object { ($_ -split ' ')[-1] } | Select-Object -Unique
    foreach ($procId in $procIds) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host ("Parado processo PID: " + $procId)
        } catch {
            Write-Host ("Falha ao parar PID " + $procId + ": " + $_.Exception.Message)
        }
    }
}
Write-Host "Iniciando modo dev (npm run dev)..."
npm run dev
