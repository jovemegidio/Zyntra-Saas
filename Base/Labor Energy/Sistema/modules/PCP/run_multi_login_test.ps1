# Test login for multiple users (identifiers) using password admin123
$baseUrl = 'http://localhost:3001'
$users = @(
    'clemerson.silva@aluforce.ind.br',
    'andreia@aluforce.ind.br',
    'ti@aluforce.ind.br'
)

foreach ($u in $users) {
    Write-Host "== Testing login for: $u =="
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $body = @{ email = $u; password = 'admin123' } | ConvertTo-Json
    try {
        $resp = Invoke-WebRequest -Uri "$baseUrl/api/pcp/login" -Method Post -Body $body -ContentType 'application/json' -WebSession $session -ErrorAction Stop
        $status = $resp.StatusCode
        $setCookie = $resp.Headers['Set-Cookie'] -join '; '
        Write-Host "STATUS: $status"
        if ($setCookie) { Write-Host "SET-COOKIE: $setCookie" } else { Write-Host "SET-COOKIE: (none)" }
        $bodyText = $resp.Content
        if ($bodyText.Length -gt 0) { Write-Host "BODY: $bodyText" }
        Write-Host "-- Cookie Jar --"
        $session.Cookies.GetCookies($baseUrl) | ForEach-Object { Write-Host "$($_.Name)=$($_.Value)" }
    } catch {
        Write-Host "LOGIN_FAIL: $($_.Exception.Message)"
    }
    Write-Host "`n"
}
Write-Host "Done"
