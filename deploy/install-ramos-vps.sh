#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/zyntra-ramos"
SITE_FILE="/etc/nginx/sites-enabled/aluforce"
SNIPPET_FILE="/etc/nginx/snippets/zyntra-ramos-locations.conf"
BACKUP_DIR="/var/www/backups"

if [ ! -d "$APP_DIR" ]; then
  echo "App directory not found: $APP_DIR" >&2
  exit 1
fi

if [ ! -f "$SNIPPET_FILE" ]; then
  echo "Nginx snippet not found: $SNIPPET_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$SITE_FILE" "$BACKUP_DIR/aluforce-nginx-pre-ramos-$(date +%Y%m%d-%H%M%S).conf"

if ! grep -q "zyntra-ramos-locations.conf" "$SITE_FILE"; then
  python3 - <<'PY'
from pathlib import Path

site = Path("/etc/nginx/sites-enabled/aluforce")
text = site.read_text()
include = "    include /etc/nginx/snippets/zyntra-ramos-locations.conf;\n\n"
needle = "    location / {\n"

if include not in text:
    if needle not in text:
        raise SystemExit("Could not find default location block to insert Zyntra Ramos include")
    text = text.replace(needle, include + needle, 1)
    site.write_text(text)
PY
fi

cd "$APP_DIR"
npm install --omit=dev --no-audit --no-fund

if pm2 describe zyntra-ramos >/dev/null 2>&1; then
  pm2 restart zyntra-ramos --update-env
else
  pm2 start ecosystem.ramos.config.js
fi
pm2 save

nginx -t
systemctl reload nginx

echo "Zyntra Ramos installed"
