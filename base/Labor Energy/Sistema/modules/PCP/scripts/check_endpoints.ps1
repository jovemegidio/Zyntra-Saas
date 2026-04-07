$urls = @(
    'http://localhost:3001/health',
    'http://localhost:3001/api/pcp/produtos',
    'http://localhost:3001/api/pcp/search?q=test'
)

foreach ($u in $urls) {
    Write-Host "=== $u ==="
    try {
        $r = Invoke-RestMethod -Uri $u -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        if ($r -is [System.Array]) {
            $sample = $r | Select-Object -First 3
            Write-Host ($sample | ConvertTo-Json -Depth 4)
        } else {
            Write-Host ($r | ConvertTo-Json -Depth 4)
        }
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)"
    }
    Write-Host ""
}
