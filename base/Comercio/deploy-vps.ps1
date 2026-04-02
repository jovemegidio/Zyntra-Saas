# ============================================================
# ALUFORCE - Deploy VPS sem senha (SSH Key Auth)
# Uso: .\deploy-vps.ps1 [arquivo1] [arquivo2] ...
#      Sem argumentos: envia arquivos modificados recentemente
# ============================================================

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arquivos
)

$VPS_HOST  = "root@31.97.64.102"
$VPS_PATH  = "/var/www/aluforce"
$LOCAL     = if ($PSScriptRoot) { $PSScriptRoot } else { "G:\Outros computadores\Meu laptop (2)\Zyntra" }
$SSH_KEY   = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$SSH_OPTS  = @("-i", $SSH_KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15")

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ALUFORCE - Deploy VPS (chave SSH)      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Deploy-File {
    param([string]$full)

    if (-not (Test-Path $full)) {
        Write-Host "  ERRO: nao encontrado: $full" -ForegroundColor Red
        return $false
    }

    $rel      = $full.Replace($LOCAL + "\", "") -replace "\\", "/"
    $dir      = ($rel | Split-Path -Parent) -replace "\\", "/"

    if ($dir) {
        ssh @SSH_OPTS $VPS_HOST "mkdir -p $VPS_PATH/$dir" 2>$null
    }

    Write-Host "  -> $rel" -NoNewline -ForegroundColor Yellow
    scp @SSH_OPTS "$full" "${VPS_HOST}:${VPS_PATH}/${rel}" 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
        return $true
    } else {
        Write-Host " [ERRO]" -ForegroundColor Red
        return $false
    }
}

$ok  = 0
$err = 0

if ($Arquivos -and $Arquivos.Count -gt 0) {
    foreach ($f in $Arquivos) {
        $full = if ([System.IO.Path]::IsPathRooted($f)) { $f } else { Join-Path $LOCAL $f }
        if (Deploy-File $full) { $ok++ } else { $err++ }
    }
} else {
    Write-Host "Buscando arquivos modificados nas ultimas 2 horas..." -ForegroundColor Gray
    $cutoff = (Get-Date).AddHours(-2)
    $files  = Get-ChildItem -Path $LOCAL -Recurse -File |
              Where-Object {
                  $_.LastWriteTime -gt $cutoff -and
                  $_.FullName -notmatch '\\\.git\\|\\node_modules\\|\\\.vs\\|\\backups\\' -and
                  $_.Extension -match '\.(js|html|css|json|sql|ps1)$'
              } |
              Sort-Object LastWriteTime -Descending |
              Select-Object -First 20

    if ($files.Count -eq 0) {
        Write-Host "Nenhum arquivo modificado nas ultimas 2 horas." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "Encontrados $($files.Count) arquivos:" -ForegroundColor Green
    Write-Host ""
    foreach ($f in $files) {
        if (Deploy-File $f.FullName) { $ok++ } else { $err++ }
    }
}

Write-Host ""
Write-Host "------------------------------------------" -ForegroundColor DarkGray
Write-Host "Resultado: $ok enviados, $err erros" -ForegroundColor $(if ($err -eq 0) { "Green" } else { "Yellow" })

if ($ok -gt 0) {
    Write-Host ""
    $restart = Read-Host "Reiniciar PM2? (s/N)"
    if ($restart -eq "s" -or $restart -eq "S") {
        Write-Host "Reiniciando PM2..." -ForegroundColor Cyan
        ssh @SSH_OPTS $VPS_HOST "pm2 restart aluforce-dashboard --update-env && pm2 save"
        Write-Host "PM2 reiniciado!" -ForegroundColor Green
    }
}
