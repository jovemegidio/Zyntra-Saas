param(
    [string]$BaseUrl = "http://localhost:3001",
    [string]$AuthBearer = "",
    [string]$AuthCookie = "",
    [int]$OpId = 1024,
    [int]$EtapaId = 1,
    [int]$OrdemCompraId = 1,
    [int]$QtdPorReq = 10,
    [string]$SummaryOut = "tests/perf/pcp-devspec-summary.json",
    [string]$TestScript = "tests/perf/pcp-devspec.k6.js",
    [string]$PortableK6Dir = ".tools/k6",
    [string]$PortableK6Version = "0.49.0"
)

$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$testScriptPath = Resolve-Path (Join-Path $repoRoot $TestScript) -ErrorAction SilentlyContinue
if (-not $testScriptPath) { $testScriptPath = Join-Path $repoRoot $TestScript }

function Resolve-RepoPath {
    param([string]$PathValue)

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $PathValue))
}

function Ensure-Directory {
    param([string]$DirPath)

    if (-not (Test-Path $DirPath)) {
        New-Item -ItemType Directory -Path $DirPath -Force | Out-Null
    }
}

function Ensure-PortableK6 {
    param(
        [string]$InstallDir,
        [string]$Version
    )

    $resolvedInstallDir = Resolve-RepoPath $InstallDir
    $exePath = Join-Path $resolvedInstallDir "k6.exe"

    if (Test-Path $exePath) {
        return $exePath
    }

    Ensure-Directory $resolvedInstallDir

    $versionTag = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
    $versionNumber = $versionTag.TrimStart('v')
    $zipName = "k6-$versionTag-windows-amd64.zip"
    $zipPath = Join-Path $resolvedInstallDir $zipName
    $extractDir = Join-Path $resolvedInstallDir "extract-$versionTag"
    $downloadUrl = "https://github.com/grafana/k6/releases/download/$versionTag/$zipName"

    Write-Host "[k6] Baixando binário portátil: $downloadUrl"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

    if (Test-Path $extractDir) {
        Remove-Item -Recurse -Force $extractDir
    }

    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    $downloadedExe = Get-ChildItem -Path $extractDir -Filter "k6.exe" -Recurse | Select-Object -First 1
    if (-not $downloadedExe) {
        throw "Download concluído, mas k6.exe não foi encontrado no zip extraído."
    }

    Copy-Item -Path $downloadedExe.FullName -Destination $exePath -Force
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue

    return $exePath
}

$resolvedSummaryOut = Resolve-RepoPath $SummaryOut
$summaryOutDir = Split-Path -Parent $resolvedSummaryOut
Ensure-Directory $summaryOutDir

$k6 = Get-Command k6 -ErrorAction SilentlyContinue
$docker = Get-Command docker -ErrorAction SilentlyContinue
$useDocker = $false
$k6Executable = $null

if ($k6) {
    $k6Executable = $k6.Source
}

if (-not $k6Executable -and $docker) {
    $oldErr = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    docker info *> $null
    $ErrorActionPreference = $oldErr

    if ($LASTEXITCODE -eq 0) {
        $useDocker = $true
        Write-Host "[k6] k6 local não encontrado. Usando Docker (grafana/k6)."
    } else {
        Write-Warning "[k6] Docker encontrado, mas o daemon não está em execução. Tentando fallback portátil."
    }
}

if (-not $k6Executable -and -not $useDocker) {
    try {
        $k6Executable = Ensure-PortableK6 -InstallDir $PortableK6Dir -Version $PortableK6Version
        Write-Host "[k6] Usando binário portátil em: $k6Executable"
    } catch {
        Write-Error "Não foi possível preparar o k6 portátil. Detalhes: $($_.Exception.Message)"
        exit 1
    }
}

$env:PCP_BASE_URL = $BaseUrl
$env:PCP_AUTH_BEARER = $AuthBearer
$env:PCP_AUTH_COOKIE = $AuthCookie
$env:PCP_OP_ID = [string]$OpId
$env:PCP_ETAPA_ID = [string]$EtapaId
$env:PCP_ORDEM_COMPRA_ID = [string]$OrdemCompraId
$env:PCP_QTD_POR_REQ = [string]$QtdPorReq

Write-Host "[k6] Executando: $TestScript"
    Write-Host "[k6] BaseUrl: $BaseUrl"
    Write-Host "[k6] OP: $OpId | Etapa: $EtapaId | OrdemCompraPDF: $OrdemCompraId | QtdPorReq: $QtdPorReq"

if ($useDocker) {
    $repoRootNormalized = [System.IO.Path]::GetFullPath($repoRoot)
    $summaryOutNormalized = [System.IO.Path]::GetFullPath($resolvedSummaryOut)

    if (-not $summaryOutNormalized.StartsWith($repoRootNormalized, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Error "Ao usar Docker, SummaryOut precisa apontar para um arquivo dentro do repositório. Valor atual: $SummaryOut"
        exit 1
    }

    $summaryRelative = $summaryOutNormalized.Substring($repoRootNormalized.Length).TrimStart('\', '/')
    $summaryContainer = "/work/" + ($summaryRelative -replace '\\', '/')

    docker run --rm `
        -v "${repoRoot}:/work" `
        -w /work `
        -e PCP_BASE_URL `
        -e PCP_AUTH_BEARER `
        -e PCP_AUTH_COOKIE `
        -e PCP_OP_ID `
        -e PCP_ETAPA_ID `
        -e PCP_ORDEM_COMPRA_ID `
        $testScriptContainer = "/work/" + ($TestScript -replace '\\', '/')
        docker run --rm `
            -v "${repoRoot}:/work" `
            -w /work `
            -e PCP_BASE_URL `
            -e PCP_AUTH_BEARER `
            -e PCP_AUTH_COOKIE `
            -e PCP_OP_ID `
            -e PCP_ETAPA_ID `
            -e PCP_ORDEM_COMPRA_ID `
            -e PCP_QTD_POR_REQ `
            grafana/k6 run --summary-export $summaryContainer $testScriptContainer
} else {
    & $k6Executable run --summary-export $resolvedSummaryOut $testScriptPath
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Execução k6 falhou com exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "[k6] Execução concluída. Summary: $resolvedSummaryOut"
