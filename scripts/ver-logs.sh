#!/usr/bin/env bash
# Muestra quién abrió qué guía y cuándo (DATA_DIR/access-log.jsonl en el servidor).
# Requiere estar linkeado con `railway link` en este proyecto.
set -euo pipefail

railway ssh cat /data/access-log.jsonl | while IFS= read -r linea; do
  [ -z "$linea" ] && continue
  echo "$linea" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['ts'], d['slug'], d['name'])"
done
