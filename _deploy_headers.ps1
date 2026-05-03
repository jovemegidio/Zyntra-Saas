$s = "C:\Windows\System32\OpenSSH\scp.exe"
$k = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$v = "root@31.97.64.102"

$deploys = @(
  @("modules\NFe\danfe.html", "/var/www/labor-energy/modules/NFe/danfe.html"),
  @("modules\RH\public\pages\relatorios.html", "/var/www/aluforce/modules/RH/public/pages/relatorios.html"),
  @("modules\RH\public\pages\relatorios.html", "/var/www/labor-eletric/modules/RH/public/pages/relatorios.html"),
  @("modules\RH\public\pages\relatorios.html", "/var/www/labor-energy/modules/RH/public/pages/relatorios.html"),
  @("modules\Compras\qrcode-estoque.html", "/var/www/aluforce/modules/Compras/qrcode-estoque.html"),
  @("modules\Compras\qrcode-estoque.html", "/var/www/labor-eletric/modules/Compras/qrcode-estoque.html"),
  @("modules\Compras\qrcode-estoque.html", "/var/www/labor-energy/modules/Compras/qrcode-estoque.html")
)

foreach ($d in $deploys) {
  & $s -o StrictHostKeyChecking=no -i $k $d[0] "${v}:$($d[1])"
  Write-Host "$($d[0]) -> $($d[1]) : exit=$LASTEXITCODE"
}
Write-Host "All done"
