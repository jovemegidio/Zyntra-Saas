$s = "C:\Windows\System32\OpenSSH\scp.exe"
$k = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$v = "root@31.97.64.102"

$deploys = @(
    @("modules/RH/public/gestao-holerites.html", "/var/www/aluforce/modules/RH/public/gestao-holerites.html"),
    @("modules/RH/public/gestao-holerites.html", "/var/www/labor-eletric/modules/RH/public/gestao-holerites.html"),
    @("modules/RH/public/gestao-holerites.html", "/var/www/labor-energy/modules/RH/public/gestao-holerites.html"),
    @("modules/RH/server.js", "/var/www/aluforce/modules/RH/server.js"),
    @("modules/RH/server.js", "/var/www/labor-eletric/modules/RH/server.js"),
    @("modules/RH/server.js", "/var/www/labor-energy/modules/RH/server.js")
)

foreach ($d in $deploys) {
    & $s -o StrictHostKeyChecking=no -i $k $d[0] "${v}:$($d[1])"
    Write-Host "$($d[0]) -> $($d[1]) : exit=$LASTEXITCODE"
}

Write-Host "Deploy done. Restarting PM2..."
$ssh = "C:\Windows\System32\OpenSSH\ssh.exe"
& $ssh -o StrictHostKeyChecking=no -i $k $v "pm2 restart aluforce-v2-production labor-eletric-demo labor-energy-demo"
Write-Host "PM2 restart exit=$LASTEXITCODE"
