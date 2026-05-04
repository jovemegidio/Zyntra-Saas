Write-Host '=== Node processes (Win32_Process) ==='
try {
    $nodes = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.Name -like 'node*' }
    if ($nodes) {
        $nodes | Select-Object ProcessId, Name, CommandLine, CreationDate | Format-List
    } else { Write-Host 'No node processes found' }
} catch { Write-Host 'Error enumerating processes:' $_.Exception.Message }

Write-Host "`n=== Test TCP port 3001 (127.0.0.1) ==="
try { Test-NetConnection -ComputerName 127.0.0.1 -Port 3001 -WarningAction SilentlyContinue | Format-List } catch { Write-Host 'Test-NetConnection failed:' $_.Exception.Message }

function callUrl($u) {
    Write-Host "`n--- $u ---"
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 6 -ErrorAction Stop
        Write-Host ('Status: ' + $r.StatusCode)
        $b = $r.Content
        if ($b.Length -gt 1000) { $b = $b.Substring(0,1000) + '... [truncated]' }
        Write-Host $b
    } catch {
        Write-Host 'FAILED: ' + $_.Exception.Message
    }
}

callUrl 'http://127.0.0.1:3001/health'
callUrl 'http://localhost:3001/health'
callUrl 'http://127.0.0.1:3001/api/pcp/produtos'
callUrl 'http://127.0.0.1:3001/api/pcp/search?q=test'
