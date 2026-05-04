Write-Host '=== Quick status ===' -ForegroundColor Cyan

Write-Host "\n-- Node processes --"
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime, Path | Format-List

Write-Host "\n-- netstat :3001 lines --"
netstat -ano | Select-String ':3001' | ForEach-Object { $_.ToString().Trim() } | ForEach-Object { Write-Host $_ }

Write-Host "\n-- Try internal-debug (127.0.0.1) --"
try {
    $d = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/internal-debug' -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
    Write-Host (ConvertTo-Json $d -Depth 4)
} catch {
    Write-Host 'INTERNAL-DEBUG FAILED: ' + $_.Exception.Message
}

Write-Host "\n-- Try health (127.0.0.1) --"
try {
    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
    Write-Host (ConvertTo-Json $h -Depth 3)
} catch {
    Write-Host 'HEALTH FAILED: ' + $_.Exception.Message
}

Write-Host "\nQuick status complete." -ForegroundColor Green
