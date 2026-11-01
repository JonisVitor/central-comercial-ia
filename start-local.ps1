$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$panelUrl = 'http://127.0.0.1:4175/'
$runtimeUrl = 'http://127.0.0.1:4174/api/agent-runtime/health'

function Test-LocalEndpoint([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Test-PortInUse([int]$Port) {
  return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Start-ProjectService([string]$Name, [int]$Port, [string]$NpmScript) {
  if (Test-PortInUse $Port) {
    Write-Host "${Name}: a porta $Port já está ocupada, vou reutilizar o serviço existente."
    return
  }

  Write-Host "Iniciando $Name..."
  $nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
  $stdout = Join-Path $projectRoot "$NpmScript-startup.log"
  $stderr = Join-Path $projectRoot "$NpmScript-startup-error.log"
  if ($NpmScript -eq 'agents-runtime') {
    $arguments = @('agents-runtime/server.mjs')
  } else {
    $arguments = @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175')
  }
  Start-Process -FilePath $nodeExe -ArgumentList $arguments -WorkingDirectory $projectRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden
}

if (-not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
  Write-Host 'Dependências do projeto não encontradas. Abra um terminal nesta pasta e rode npm install.' -ForegroundColor Red
  exit 1
}

if (-not (Test-LocalEndpoint $runtimeUrl)) {
  Start-ProjectService 'executor Codex' 4174 'agents-runtime'
}
if (-not (Test-LocalEndpoint $panelUrl)) {
  Start-ProjectService 'painel' 4175 'dev'
}

$deadline = (Get-Date).AddSeconds(45)
do {
  $runtimeReady = Test-LocalEndpoint $runtimeUrl
  $panelReady = Test-LocalEndpoint $panelUrl
  if ($runtimeReady -and $panelReady) { break }
  Start-Sleep -Milliseconds 750
} while ((Get-Date) -lt $deadline)

if (-not $panelReady) {
  Write-Host 'O painel não respondeu em http://127.0.0.1:4175/. Confira a janela do Vite.' -ForegroundColor Red
  exit 1
}

if (-not $runtimeReady) {
  Write-Host 'O painel iniciou, mas o executor Codex não respondeu na porta 4174. Confira a janela do executor.' -ForegroundColor Yellow
  exit 1
}

Write-Host 'Painel e executor Codex estão funcionando.' -ForegroundColor Green
Start-Process $panelUrl
