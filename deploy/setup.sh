#!/usr/bin/env bash
# Instala o actualiza el bot en el servidor como contenedor Docker, igual que
# los demás proyectos que corren ahí. No instala nada en el sistema. Se corre
# como root sobre el paquete que sube deploy/subir.ps1:
#   bash setup.sh /tmp/chat-uba.tar.gz
set -euo pipefail

PAQUETE="${1:?Uso: bash setup.sh /ruta/al/chat-uba.tar.gz}"
DESTINO=/root/chat-uba

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null; then
  COMPOSE="docker-compose"
else
  echo "No encontré Docker Compose en el servidor." >&2
  exit 1
fi

# Se reemplaza el código pero se conserva el registro de consultas (data/logs).
mkdir -p "$DESTINO"
find "$DESTINO" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} +
find "$DESTINO/data" -mindepth 1 -maxdepth 1 ! -name logs -exec rm -rf {} + 2>/dev/null || true
tar -xzf "$PAQUETE" -C "$DESTINO"

# Docker toma el .env literal: sin fin de línea de Windows ni espacios al final.
sed -i 's/[[:space:]]*\r\?$//' "$DESTINO/.env"
chmod 600 "$DESTINO/.env"

# El contenedor corre como el usuario "node" (uid 1000) y tiene que poder escribir el registro.
mkdir -p "$DESTINO/data/logs"
chown 1000:1000 "$DESTINO/data/logs"

cd "$DESTINO"
$COMPOSE up -d --build

sleep 4
$COMPOSE ps
echo
$COMPOSE logs --tail=12
echo
echo "Listo. Registro en vivo: cd $DESTINO && $COMPOSE logs -f"
