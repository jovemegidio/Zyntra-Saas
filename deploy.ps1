# ============================================
# ALUFORCE - Deploy Completo (VPS + GitHub)
# ============================================
# Envia arquivos para VPS, comita no GitHub e notifica Discord
# Uso: .\deploy.ps1 [arquivo1] [arquivo2] ...
# Sem argumentos: envia todos os arquivos modificados (git diff)
# Flag: -SemGit     → pula o commit/push no GitHub
# Flag: -SemVps     → pula o upload para VPS (só comita)
# Flag: -SemBackup  → pula o backup da VPS antes do deploy
# Flag: -Rollback   → restaura o último backup na VPS (não faz deploy)

param(
   [Parameter(ValueFromRemainingArguments = $true)]
   [string[]]$Arquivos,
   [switch]$SemGit,
   [switch]$SemVps,
   [switch]$SemBackup,
   [switch]$Rollback,
   [string]$Mensagem
)

# ── Configuração ──────────────────────────────
$servidor = "YOUR_VPS_IP"
$usuario = "root"
# SECURITY: nunca hardcode credenciais — use a variável de ambiente VPS_PASSWORD
# Para definir: $env:VPS_PASSWORD = "sua_senha" (no perfil PowerShell ou pipeline CI/CD)
$senha = if ($env:VPS_PASSWORD) { $env:VPS_PASSWORD } else { Read-Host "Senha VPS" }
$caminhoRemoto = "/var/www/aluforce"
$caminhoLocal = $PSScriptRoot
if (-not $caminhoLocal) {
   $caminhoLocal = "G:\Outros computadores\Meu laptop (2)\Sistema - ALUFORCE - V.2"
}

# PuTTY no PATH
if (-not (Get-Command pscp -ErrorAction SilentlyContinue)) {
   $env:Path += ";C:\Program Files\PuTTY"
}

# ── Diretório de backups na VPS ───────────────
$backupDir = "/var/www/backups"

# ══════════════════════════════════════════════
# MODO ROLLBACK — restaura último backup
# ══════════════════════════════════════════════
if ($Rollback) {
   Write-Host ""
   Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Red
   Write-Host "║   ALUFORCE — Rollback VPS                ║" -ForegroundColor Red
   Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Red
   Write-Host ""

   # Listar backups disponíveis
   Write-Host "  🔍 Buscando backups..." -ForegroundColor Yellow
   $backupList = plink -batch -pw $senha $usuario@$servidor "ls -1t $backupDir/*.tar.gz 2>/dev/null | head -5" 2>$null
   if (-not $backupList) {
      Write-Host "  ❌ Nenhum backup encontrado em $backupDir" -ForegroundColor Red
      exit 1
   }

   Write-Host "  📦 Backups disponíveis:" -ForegroundColor Cyan
   $backups = $backupList -split "`n" | Where-Object { $_ }
   for ($i = 0; $i -lt $backups.Count; $i++) {
      $nome = Split-Path $backups[$i] -Leaf
      Write-Host "    [$i] $nome" -ForegroundColor White
   }

   # Usa o mais recente (índice 0)
   $ultimoBackup = $backups[0].Trim()
   $nomeBackup = Split-Path $ultimoBackup -Leaf
   Write-Host ""
   Write-Host "  ⏪ Restaurando: $nomeBackup" -ForegroundColor Yellow

   # Extrair backup sobre o diretório atual
   $cmdRestore = "cd $caminhoRemoto && tar xzf $ultimoBackup --strip-components=4 2>&1"
   $resultado = plink -batch -pw $senha $usuario@$servidor $cmdRestore 2>$null

   if ($LASTEXITCODE -eq 0) {
      Write-Host "  ✅ Backup restaurado com sucesso!" -ForegroundColor Green

      # Reiniciar PM2
      Write-Host "  🔄 Reiniciando PM2..." -ForegroundColor Cyan
      plink -batch -pw $senha $usuario@$servidor "pm2 restart aluforce-dashboard --update-env" 2>$null
      if ($LASTEXITCODE -eq 0) {
         Write-Host "  ✅ PM2 reiniciado!" -ForegroundColor Green
      }

      # Health check
      Start-Sleep -Seconds 4
      Write-Host "  🏥 Health check..." -ForegroundColor Cyan
      $health = plink -batch -pw $senha $usuario@$servidor "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null" 2>$null
      if ($health -match '200|301|302') {
         Write-Host "  ✅ Servidor respondendo (HTTP $health)" -ForegroundColor Green
      }
      else {
         Write-Host "  ⚠️ Servidor retornou HTTP $health — verifique logs: pm2 logs aluforce-dashboard" -ForegroundColor Yellow
      }
   }
   else {
      Write-Host "  ❌ Erro ao restaurar: $resultado" -ForegroundColor Red
   }

   Write-Host ""
   Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
   Write-Host "║       ⏪ ROLLBACK CONCLUÍDO!             ║" -ForegroundColor Green
   Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
   Write-Host ""
   exit
}
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ALUFORCE — Deploy Completo (VPS+Git)  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
Write-Host "  ⏰ $timestamp" -ForegroundColor DarkGray
Write-Host ""

# ── Função: Enviar arquivo para VPS ───────────
function Enviar-Arquivo {
   param([string]$arquivo)

   $arquivoCompleto = if ([System.IO.Path]::IsPathRooted($arquivo)) {
      $arquivo
   }
   else {
      Join-Path $caminhoLocal $arquivo
   }

   if (-not (Test-Path $arquivoCompleto)) {
      Write-Host "  ❌ Não encontrado: $arquivo" -ForegroundColor Red
      return $false
   }

   $relativo = $arquivoCompleto.Replace("$caminhoLocal\", "").Replace("$caminhoLocal/", "")
   $relativoUnix = $relativo -replace '\\', '/'

   # Criar diretório remoto
   $dirRemoto = Split-Path $relativoUnix -Parent
   if ($dirRemoto) {
      plink -batch -pw $senha $usuario@$servidor "mkdir -p $caminhoRemoto/$dirRemoto" 2>$null
   }

   Write-Host "  📤 " -NoNewline -ForegroundColor Yellow
   Write-Host $relativo -NoNewline -ForegroundColor White

   pscp -batch -pw $senha -q "$arquivoCompleto" "${usuario}@${servidor}:$caminhoRemoto/$relativoUnix" 2>$null

   if ($LASTEXITCODE -eq 0) {
      Write-Host " ✅" -ForegroundColor Green
      return $true
   }
   else {
      Write-Host " ❌" -ForegroundColor Red
      return $false
   }
}

# ══════════════════════════════════════════════
# ETAPA 1: Detectar arquivos alterados
# ══════════════════════════════════════════════

$arquivosParaDeploy = @()
$arquivosGit = @()

if ($Arquivos -and $Arquivos.Count -gt 0) {
   # Arquivos passados manualmente
   $arquivosParaDeploy = $Arquivos
   $arquivosGit = $Arquivos
   Write-Host "📦 Modo: Arquivos específicos ($($Arquivos.Count))" -ForegroundColor Yellow
}
else {
   # Detectar via git — arquivos modificados (staged + unstaged)
   Write-Host "📦 Modo: Auto-detect via Git" -ForegroundColor Yellow
   Write-Host ""

   Push-Location $caminhoLocal
   $gitChanged = git diff --name-only HEAD 2>$null
   $gitUntracked = git ls-files --others --exclude-standard 2>$null
   Pop-Location

   $todosArquivos = @()
   if ($gitChanged) { $todosArquivos += $gitChanged }
   if ($gitUntracked) { $todosArquivos += $gitUntracked }

   # Filtrar arquivos relevantes (não temp, não .git)
   $todosArquivos = $todosArquivos | Where-Object {
      $_ -and
      $_ -notmatch '^temp-' -and
      $_ -notmatch '\.md$' -and
      $_ -notmatch '^\.git/' -and
      $_ -notmatch '^node_modules/'
   } | Sort-Object -Unique

   if ($todosArquivos.Count -eq 0) {
      Write-Host "  Nenhum arquivo modificado detectado." -ForegroundColor Yellow
      Write-Host "  Dica: Passe arquivos específicos: .\deploy.ps1 server.js routes/chat-routes.js" -ForegroundColor DarkGray
      exit
   }

   $arquivosParaDeploy = $todosArquivos | ForEach-Object { Join-Path $caminhoLocal $_ }
   $arquivosGit = $todosArquivos

   Write-Host "  Encontrados $($todosArquivos.Count) arquivo(s) modificados:" -ForegroundColor Green
   foreach ($f in $todosArquivos) {
      Write-Host "    • $f" -ForegroundColor DarkGray
   }
}

Write-Host ""

# ══════════════════════════════════════════════
# ETAPA 1.5: Backup na VPS antes do deploy
# ══════════════════════════════════════════════

if (-not $SemVps -and -not $SemBackup) {
   Write-Host "━━━━━ BACKUP PRÉ-DEPLOY ━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
   Write-Host ""

   $backupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
   $backupFile = "$backupDir/aluforce-$backupTimestamp.tar.gz"

   # Criar diretório de backups se não existir
   plink -batch -pw $senha $usuario@$servidor "mkdir -p $backupDir" 2>$null

   Write-Host "  📦 Criando backup: aluforce-$backupTimestamp.tar.gz" -ForegroundColor Yellow
   $backupCmd = "tar czf $backupFile -C /var/www aluforce/ --exclude='node_modules' --exclude='logs' --exclude='.git' 2>&1"
   $backupResult = plink -batch -pw $senha $usuario@$servidor $backupCmd 2>$null

   if ($LASTEXITCODE -eq 0) {
      # Verificar tamanho do backup
      $backupSize = plink -batch -pw $senha $usuario@$servidor "du -h $backupFile | cut -f1" 2>$null
      Write-Host "  ✅ Backup criado ($backupSize)" -ForegroundColor Green

      # Limpar backups antigos (manter últimos 5)
      plink -batch -pw $senha $usuario@$servidor "ls -1t $backupDir/aluforce-*.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null" 2>$null
      Write-Host "  🧹 Backups antigos limpos (mantendo últimos 5)" -ForegroundColor DarkGray
   }
   else {
      Write-Host "  ⚠️ Falha no backup: $backupResult" -ForegroundColor Yellow
      Write-Host "  ⚠️ Continuando deploy sem backup..." -ForegroundColor Yellow
   }
   Write-Host ""
}

# ══════════════════════════════════════════════
# ETAPA 2: Upload para VPS
# ══════════════════════════════════════════════

$enviados = 0
$erros = 0

if (-not $SemVps) {
   Write-Host "━━━━━ ETAPA 2/4: Upload VPS ━━━━━━━━━━━━━" -ForegroundColor Cyan
   Write-Host ""

   foreach ($arquivo in $arquivosParaDeploy) {
      if (Enviar-Arquivo $arquivo) {
         $enviados++
      }
      else {
         $erros++
      }
   }

   Write-Host ""
   Write-Host "  VPS: $enviados enviados, $erros erros" -ForegroundColor $(if ($erros -eq 0) { "Green" } else { "Yellow" })
   Write-Host ""

   # Reiniciar PM2 se enviou .js ou .json
   $temJS = $arquivosGit | Where-Object { $_ -match '\.(js|json)$' -and $_ -notmatch 'public/' }
   if ($temJS -and $enviados -gt 0) {
      Write-Host "  🔄 Reiniciando PM2..." -ForegroundColor Cyan
      plink -batch -pw $senha $usuario@$servidor "pm2 restart aluforce-dashboard --update-env" 2>$null
      if ($LASTEXITCODE -eq 0) {
         Write-Host "  ✅ PM2 reiniciado!" -ForegroundColor Green
      }
      else {
         Write-Host "  ⚠️ Erro ao reiniciar PM2" -ForegroundColor Yellow
      }

      # Health check pós-restart
      Write-Host ""
      Write-Host "  🏥 Health check (aguardando 4s)..." -ForegroundColor Cyan
      Start-Sleep -Seconds 4
      $healthCode = plink -batch -pw $senha $usuario@$servidor "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null" 2>$null
      if ($healthCode -match '200|301|302') {
         Write-Host "  ✅ Servidor online (HTTP $healthCode)" -ForegroundColor Green
      }
      else {
         Write-Host "  ⚠️ Servidor retornou HTTP $healthCode" -ForegroundColor Yellow
         Write-Host "  💡 Verifique: plink -pw SENHA root@$servidor 'pm2 logs aluforce-dashboard --lines 20'" -ForegroundColor DarkGray
         if (-not $SemBackup) {
            Write-Host "  💡 Rollback disponível: .\deploy.ps1 -Rollback" -ForegroundColor DarkGray
         }
      }
   }
}
else {
   Write-Host "━━━━━ ETAPA 2/4: Upload VPS ━━━━━━━━━━━━━" -ForegroundColor DarkGray
   Write-Host "  ⏭️  Pulado (flag -SemVps)" -ForegroundColor DarkGray
}

Write-Host ""

# ══════════════════════════════════════════════
# ETAPA 3: Commit + Push GitHub
# ══════════════════════════════════════════════

if (-not $SemGit) {
   Write-Host "━━━━━ ETAPA 3/4: Git Commit + Push ━━━━━━" -ForegroundColor Cyan
   Write-Host ""

   Push-Location $caminhoLocal

   # Stage dos arquivos
   foreach ($f in $arquivosGit) {
      git add "$f" 2>$null
   }

   # Verificar se há algo para commitar
   $staged = git diff --cached --name-only 2>$null
   if ($staged) {
      # Gerar mensagem de commit automática se não fornecida
      if (-not $Mensagem) {
         # Detectar módulos afetados
         $modulosAfetados = @()
         foreach ($arq in $arquivosGit) {
            if ($arq -match 'modules/([^/]+)/') { $modulosAfetados += $matches[1] }
            elseif ($arq -match 'public/chat-teams/') { $modulosAfetados += 'Chat' }
            elseif ($arq -match 'routes/chat') { $modulosAfetados += 'Chat' }
            elseif ($arq -match 'routes/') { $modulosAfetados += 'Rotas' }
            elseif ($arq -match 'database/') { $modulosAfetados += 'Database' }
            elseif ($arq -match 'server\.js') { $modulosAfetados += 'Server' }
            elseif ($arq -match 'public/') { $modulosAfetados += 'Frontend' }
         }
         $modulosAfetados = $modulosAfetados | Select-Object -Unique

         $scope = if ($modulosAfetados.Count -gt 0) { ($modulosAfetados -join ',').ToLower() } else { 'geral' }
         $nArqs = ($staged | Measure-Object).Count
         $Mensagem = "deploy($scope): atualização de $nArqs arquivo(s) via deploy.ps1"
      }

      Write-Host "  📝 Commit: $Mensagem" -ForegroundColor White
      git commit -m "$Mensagem" 2>$null | Out-Null

      Write-Host "  🚀 Push para GitHub..." -ForegroundColor Yellow
      $pushResult = git push origin main 2>&1
      if ($LASTEXITCODE -eq 0) {
         $commitHash = (git rev-parse --short HEAD 2>$null)
         Write-Host "  ✅ Push OK! Commit: $commitHash" -ForegroundColor Green
      }
      else {
         Write-Host "  ⚠️ Erro no push: $pushResult" -ForegroundColor Yellow
      }
   }
   else {
      Write-Host "  ℹ️  Nada para commitar (arquivos já estão no último commit)" -ForegroundColor DarkGray
   }

   Pop-Location
}
else {
   Write-Host "━━━━━ ETAPA 3/4: Git Commit + Push ━━━━━━" -ForegroundColor DarkGray
   Write-Host "  ⏭️  Pulado (flag -SemGit)" -ForegroundColor DarkGray
}

Write-Host ""

# ══════════════════════════════════════════════
# ETAPA 3: Notificar Discord
# ══════════════════════════════════════════════

Write-Host "━━━━━ ETAPA 4/4: Discord Webhook ━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

try {
   $webhookUrl = $env:DISCORD_WEBHOOK_URL
   if (-not $webhookUrl) {
      Write-Host "  Aviso: DISCORD_WEBHOOK_URL nao configurado; notificacao pulada." -ForegroundColor Yellow
      return
   }

   # Módulos afetados
   $modulosAfetados = @()
   foreach ($arq in $arquivosGit) {
      if ($arq -match 'modules/([^/]+)/') { $modulosAfetados += $matches[1] }
      elseif ($arq -match 'public/chat-teams/') { $modulosAfetados += 'Chat' }
      elseif ($arq -match 'routes/') { $modulosAfetados += 'Rotas' }
      elseif ($arq -match 'server\.js') { $modulosAfetados += 'Servidor' }
   }
   $modulosAfetados = ($modulosAfetados | Select-Object -Unique) -join ', '
   if (-not $modulosAfetados) { $modulosAfetados = 'Sistema' }

   $arquivosField = ($arquivosGit | Select-Object -First 15 | ForEach-Object { "``$_``" }) -join "`n"
   if ($arquivosGit.Count -gt 15) {
      $arquivosField += "`n... +$($arquivosGit.Count - 15) arquivo(s)"
   }

   Push-Location $caminhoLocal
   $commitHash = git rev-parse --short HEAD 2>$null
   Pop-Location

   $etapas = @()
   if (-not $SemVps) { $etapas += "VPS ✅" }
   if (-not $SemGit) { $etapas += "GitHub ✅ ($commitHash)" }
   $etapasStr = $etapas -join ' | '

   $descricao = if ($Mensagem) { $Mensagem } else { "Deploy de $($arquivosGit.Count) arquivo(s) - $modulosAfetados" }
   $footerText = "Deploy Completo (VPS+Git) - " + (Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
   $tsNow = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
   $discordPayload = @{
      embeds = @(@{
            title       = "Deploy Realizado - ALUFORCE"
            description = $descricao
            color       = 3447003
            fields      = @(
               @{ name = "Modulos"; value = $modulosAfetados; inline = $true }
               @{ name = "Status"; value = $etapasStr; inline = $true }
               @{ name = "Arquivos ($($arquivosGit.Count))"; value = $arquivosField; inline = $false }
            )
            footer      = @{ text = $footerText }
            timestamp   = $tsNow
         })
   }
   $discordPayload = $discordPayload | ConvertTo-Json -Depth 10

   $bytes = [System.Text.Encoding]::UTF8.GetBytes($discordPayload)
   Invoke-RestMethod -Uri $webhookUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes | Out-Null
   Write-Host "  ✅ Discord notificado!" -ForegroundColor Green
}
catch {
   Write-Host "  ⚠️ Falha Discord: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ── Resumo Final ──────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          ✅ DEPLOY CONCLUÍDO!            ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════╣" -ForegroundColor Green
if (-not $SemVps) {
   Write-Host "║  📤 VPS:    $enviados enviado(s), $erros erro(s)            ║" -ForegroundColor $(if ($erros -eq 0) { "Green" } else { "Yellow" })
}
if (-not $SemGit) {
   Write-Host "║  🐙 GitHub: commit $commitHash pushed       ║" -ForegroundColor Green
}
Write-Host "║  📣 Discord notificado                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
