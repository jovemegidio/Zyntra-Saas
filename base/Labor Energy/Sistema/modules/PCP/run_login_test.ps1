# run_login_test.ps1
# Usage: pwsh -NoProfile -ExecutionPolicy Bypass -File .\run_login_test.ps1
# Reads test_login_body.json, performs login and then requests /api/pcp/produtos

$ErrorActionPreference = 'Stop'
try {
  $body = Get-Content -Raw -Path "$PSScriptRoot\test_login_body.json"
} catch {
  Write-Host "ERROR: cannot read test_login_body.json: $($_.Exception.Message)"; exit 2
}

$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "== LOGIN POST =="
try {
  $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3001/api/pcp/login' -Method Post -Body $body -ContentType 'application/json' -WebSession $sess -TimeoutSec 10
  Write-Host "STATUS:" $r.StatusCode
  Write-Host "SET-COOKIE:" ($r.Headers['Set-Cookie'])
  Write-Host "BODY:"; Write-Host $r.Content
} catch {
  Write-Host "LOGIN_FAIL:" $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $sr = $_.Exception.Response.GetResponseStream()
      $rd = New-Object System.IO.StreamReader($sr)
      Write-Host 'RESPONSE_BODY:'; Write-Host $rd.ReadToEnd()
    } catch {}
  }
}

Write-Host "`n== PRODUTOS GET =="
try {
  $p = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3001/api/pcp/produtos' -WebSession $sess -TimeoutSec 10
  Write-Host 'STATUS:' $p.StatusCode
  Write-Host 'BODY:'; Write-Host $p.Content
} catch {
  Write-Host 'PRODUTOS_FAIL:' $_.Exception.Message
}

# Print cookie jar for debugging
Write-Host "`n== COOKIE JAR =="
foreach ($c in $sess.Cookies.GetCookies('http://localhost')) { Write-Host ($c.Name + '=' + $c.Value) }
