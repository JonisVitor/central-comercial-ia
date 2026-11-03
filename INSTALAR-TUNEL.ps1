$ErrorActionPreference = 'Stop'
$destination = Join-Path $PSScriptRoot '.local-tools'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$release = Invoke-RestMethod 'https://api.github.com/repos/cloudflare/cloudflared/releases/latest'
$asset = $release.assets | Where-Object name -eq 'cloudflared-windows-amd64.exe' | Select-Object -First 1
if (-not $asset -or -not $asset.digest) { throw 'A versão oficial não informou um hash verificável. Instalação interrompida.' }
$file = Join-Path $destination 'cloudflared.exe'
Invoke-WebRequest $asset.browser_download_url -OutFile $file
$actual = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
if ($asset.digest -ne "sha256:$actual") { throw 'O hash do arquivo não confere com o publicado pelo GitHub.' }
& $file --version
$help = & $file tunnel --help | Out-String
if ($help -notmatch 'allowed-mail') { throw 'Esta versão não oferece o login por e-mail exigido pelo painel.' }
Write-Host 'Cloudflared instalado e verificado. Nenhum túnel foi iniciado.'
