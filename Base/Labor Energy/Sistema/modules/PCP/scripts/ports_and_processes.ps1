Write-Host '=== Ports & Processes diagnostic ===' -ForegroundColor Cyan

# List TCP listeners on port 3001 (preferred API)
Write-Host "\n-- Get-NetTCPConnection (listening on 3001) --"
try {
    $conns = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction Stop
    if ($conns) {
        $conns | Format-Table -AutoSize
    } else {
        Write-Host 'No listening TCP connections reported by Get-NetTCPConnection'
    }
} catch {
    Write-Host 'Get-NetTCPConnection not available or failed:' $_.Exception.Message
}

# Fallback to netstat if needed
Write-Host "\n-- netstat fallback lines for :3001 --"
try {
    $lines = netstat -ano | Select-String ':3001' | ForEach-Object { $_.ToString().Trim() }
    if ($lines) { $lines | ForEach-Object { Write-Host $_ } } else { Write-Host 'No netstat lines for :3001' }
} catch {
    Write-Host 'netstat failed:' $_.Exception.Message
}

# Show process details for any owning PIDs discovered
Write-Host "\n-- Process details for PIDs owning port 3001 --"
$pids = @()
try {
    $pids = @(Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue) | Select-Object -Unique
} catch { }
if (-not $pids -or $pids.Count -eq 0) {
    try {
        $pids = (netstat -ano | Select-String ':3001' | ForEach-Object { ($_ -split '\s+')[-1] }) | Select-Object -Unique
    } catch { }
}
if ($pids -and $pids.Count -gt 0) {
    foreach ($procId in $pids) {
        if ($procId -and $procId -ne '0') {
            Write-Host "PID: $procId"
            try {
                $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction Stop
                $proc | Select-Object ProcessId, Name, CommandLine, CreationDate | Format-List
            } catch {
                Write-Host ("Could not fetch Win32_Process for PID ${procId}: " + $_.Exception.Message)
            }
        } else { Write-Host 'Skipping PID 0 or empty' }
    }
} else { Write-Host 'No PID found owning port 3001' }

# Test HTTP endpoints using several hostnames
function testUrl($u) {
    Write-Host "\n--- Testing $u ---"
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "Status: $($r.StatusCode)"
        $body = $r.Content
        if ($body.Length -gt 1000) { $body = $body.Substring(0,1000) + '... [truncated]' }
        Write-Host $body
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)"
    }
}

$hosts = @('http://127.0.0.1:3001/health','http://localhost:3001/health','http://[::1]:3001/health')
foreach ($h in $hosts) { testUrl $h }

Write-Host "\nDiagnostic complete." -ForegroundColor Green
