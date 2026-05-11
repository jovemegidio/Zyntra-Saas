# ============================================
# ALUFORCE - Deploy Rápido para VPS
# ============================================
# Envia arquivos específicos para o servidor
# Uso: .\deploy-rapido.ps1 [arquivo1] [arquivo2] ...
# Sem argumentos: envia todos os arquivos modificados recentemente

param(
   [Parameter(ValueFromRemainingArguments = $true)]
   [string[]]$Arquivos
)

$servidor = "YOUR_VPS_IP"
$usuario = "root"
$caminhoRemoto = "/var/www/aluforce"
$caminhoLocal = $PSScriptRoot
if (-not $caminhoLocal) {
   $caminhoLocal = "G:\Outros computadores\Meu laptop (2)\Zyntra"
}

# Chave SSH sem senha (gerada para auto-deploy)
$sshKey = "$env:USERPROFILE\.ssh\id_ed25519_vps"
$sshOpts = "-i `"$sshKey`" -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=15"

function SSH-Run {
   param([string]$cmd)
   ssh $sshOpts.Split(' ') "${usuario}@${servidor}" $cmd 2>&1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   ALUFORCE - Deploy Rapido para VPS       " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Enviar-Arquivo {
   param([string]$arquivo)

   $arquivoCompleto = if ([System.IO.Path]::IsPathRooted($arquivo)) {
      $arquivo
   }
   else {
      Join-Path $caminhoLocal $arquivo
   }

   if (-not (Test-Path $arquivoCompleto)) {
      Write-Host "  ERRO: Arquivo nao encontrado: $arquivo" -ForegroundColor Red
      return $false
   }

   $relativo = $arquivoCompleto.Replace("$caminhoLocal\", "")
   $relativoUnix = $relativo -replace '\\', '/'

   # Criar diretório remoto se necessário
   $dirRemoto = Split-Path $relativoUnix -Parent
   if ($dirRemoto) {
      SSH-Run "mkdir -p $caminhoRemoto/$dirRemoto" | Out-Null
   }

   Write-Host "  Enviando: " -NoNewline -ForegroundColor Yellow
   Write-Host $relativo -ForegroundColor White

   scp $sshOpts.Split(' ') "$arquivoCompleto" "${usuario}@${servidor}:$caminhoRemoto/$relativoUnix" 2>$null

   if ($LASTEXITCODE -eq 0) {
      Write-Host "  OK! " -ForegroundColor Green
      return $true
   }
   else {
      Write-Host "  ERRO ao enviar!" -ForegroundColor Red
      return $false
   }
}

$enviados = 0
$erros = 0

if ($Arquivos -and $Arquivos.Count -gt 0) {
   # Enviar arquivos específicos
   foreach ($arquivo in $Arquivos) {
      if (Enviar-Arquivo $arquivo) {
         $enviados++
      }
      else {
         $erros++
      }
   }
}
else {
   # Enviar arquivos modificados nas últimas 2 horas
   Write-Host "Buscando arquivos modificados recentemente..." -ForegroundColor Gray

   $horasAtras = (Get-Date).AddHours(-2)
   $arquivosRecentes = Get-ChildItem -Path $caminhoLocal -Recurse -File |
   Where-Object {
      $_.LastWriteTime -gt $horasAtras -and
      $_.FullName -notmatch '\\\.git\\|\\node_modules\\|\\\.vs\\' -and
      $_.Extension -match '\.(js|html|css|json|sql)$'
   } |
   Sort-Object LastWriteTime -Descending |
   Select-Object -First 20

   if ($arquivosRecentes.Count -eq 0) {
      Write-Host "Nenhum arquivo modificado nas ultimas 2 horas." -ForegroundColor Yellow
      exit
   }

   Write-Host "Encontrados $($arquivosRecentes.Count) arquivos modificados:" -ForegroundColor Green
   Write-Host ""

   foreach ($arquivo in $arquivosRecentes) {
      if (Enviar-Arquivo $arquivo.FullName) {
         $enviados++
      }
      else {
         $erros++
      }
   }
}

Write-Host ""
Write-Host "--------------------------------------------" -ForegroundColor DarkGray
Write-Host "Resumo: $enviados enviados, $erros erros" -ForegroundColor $(if ($erros -eq 0) { "Green" } else { "Yellow" })

# Perguntar se deseja reiniciar PM2
if ($enviados -gt 0) {
   Write-Host ""
   $reiniciar = Read-Host "Reiniciar PM2? (s/N)"
   if ($reiniciar -eq "s" -or $reiniciar -eq "S") {
      Write-Host ""
      Write-Host "Reiniciando PM2..." -ForegroundColor Cyan
      SSH-Run "pm2 restart aluforce-dashboard --update-env" | Write-Host
      Write-Host "PM2 reiniciado!" -ForegroundColor Green
   }

   # Notificar Discord automaticamente sobre o deploy
   Write-Host ""
   Write-Host "Notificando Discord sobre deploy..." -ForegroundColor Magenta
   try {
      # Montar lista de arquivos enviados automaticamente
      $listaArquivosEnviados = @()
      if ($Arquivos -and $Arquivos.Count -gt 0) {
         $listaArquivosEnviados = $Arquivos | ForEach-Object {
            $_ -replace '.*\\Sistema - ALUFORCE - V\.2\\', '' -replace '\\', '/'
         }
      } else {
         $listaArquivosEnviados = @("Arquivos modificados recentemente (auto-detect)")
      }

      # Gerar descrição automática baseada nos arquivos
      $modulosAfetados = @()
      foreach ($arq in $listaArquivosEnviados) {
         if ($arq -match 'modules/([^/]+)/') { $modulosAfetados += $matches[1] }
         elseif ($arq -match 'routes/') { $modulosAfetados += 'Rotas' }
         elseif ($arq -match 'services/') { $modulosAfetados += 'Serviços' }
         elseif ($arq -match 'server\.js') { $modulosAfetados += 'Servidor' }
      }
      $modulosAfetados = $modulosAfetados | Select-Object -Unique
      $moduloStr = if ($modulosAfetados.Count -gt 0) { $modulosAfetados -join ', ' } else { 'Sistema' }
      $descAuto = "Deploy de $enviados arquivo(s) — Módulos: $moduloStr"

      # Webhook direto — não depende de helper
      $webhookUrl = $env:DISCORD_WEBHOOK_URL
      if (-not $webhookUrl) {
         Write-Host "Aviso: DISCORD_WEBHOOK_URL nao configurado; notificacao pulada." -ForegroundColor Yellow
         return
      }

      $arquivosField = ($listaArquivosEnviados | Select-Object -First 15 | ForEach-Object { "``$_``" }) -join "`n"
      if ($listaArquivosEnviados.Count -gt 15) {
         $arquivosField += "`n... +$($listaArquivosEnviados.Count - 15) arquivo(s)"
      }

      $discordPayload = @{
         embeds = @(@{
            title       = "🚀 Deploy Realizado — ALUFORCE"
            description = $descAuto
            color       = 3447003
            fields      = @(
               @{ name = "📦 Módulos"; value = $moduloStr; inline = $true }
               @{ name = "✅ Enviados"; value = "$enviados"; inline = $true }
               @{ name = "❌ Erros"; value = "$erros"; inline = $true }
               @{ name = "📁 Arquivos ($($listaArquivosEnviados.Count))"; value = $arquivosField; inline = $false }
            )
            footer      = @{ text = "Deploy via VS Code | $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" }
            timestamp   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
         })
      } | ConvertTo-Json -Depth 10
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($discordPayload)
      Invoke-RestMethod -Uri $webhookUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes | Out-Null
      Write-Host "Discord notificado!" -ForegroundColor Green
   } catch {
      Write-Host "Aviso: Falha ao notificar Discord: $($_.Exception.Message)" -ForegroundColor Yellow
   }
}

Write-Host ""
