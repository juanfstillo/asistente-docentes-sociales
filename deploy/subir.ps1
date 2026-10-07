# Empaqueta el bot, lo sube al servidor y lo instala o actualiza.
# Uso (desde la carpeta chat-uba):
#   powershell -ExecutionPolicy Bypass -File deploy\subir.ps1 -Servidor 1.2.3.4
param(
  [Parameter(Mandatory = $true)][string]$Servidor,
  [string]$Usuario = "root"
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$paquete = Join-Path $env:TEMP "chat-uba.tar.gz"

if (-not (Test-Path (Join-Path $raiz ".env"))) { throw "Falta el archivo .env en $raiz" }

# No se suben las dependencias (se instalan allá), ni los PDF originales, ni el registro local.
tar -czf $paquete -C $raiz --exclude=node_modules --exclude=data/pdfs --exclude=data/logs --exclude=.git .
if ($LASTEXITCODE -ne 0) { throw "No se pudo armar el paquete" }

$destino = "$Usuario@$Servidor"
scp $paquete "${destino}:/tmp/chat-uba.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "No se pudo subir el paquete" }

ssh $destino "mkdir -p /tmp/chat-uba-setup && tar -xzf /tmp/chat-uba.tar.gz -C /tmp/chat-uba-setup ./deploy/setup.sh && sed -i 's/\r$//' /tmp/chat-uba-setup/deploy/setup.sh && bash /tmp/chat-uba-setup/deploy/setup.sh /tmp/chat-uba.tar.gz; rm -rf /tmp/chat-uba-setup /tmp/chat-uba.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "La instalación en el servidor falló" }

Remove-Item $paquete
Write-Host "Web: http://${Servidor}:3000"
