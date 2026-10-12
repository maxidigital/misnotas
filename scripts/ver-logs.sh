#!/usr/bin/env bash
# Muestra quién abrió qué guía, cuándo, desde qué dispositivo y si fue desde la app
# instalada o el navegador; también cuándo la instalan
# (DATA_DIR/access-log.jsonl en el servidor). Las entradas anteriores a que se
# registrara el dispositivo salen con "-".
# Requiere estar linkeado con `railway link` en este proyecto.
set -euo pipefail

railway ssh cat /data/access-log.jsonl | python3 -c '
import json, sys

EVENTOS = {"open": "entró", "install": "INSTALÓ"}
for linea in sys.stdin:
    linea = linea.strip()
    if not linea:
        continue
    try:
        d = json.loads(linea)
    except ValueError:
        continue
    modo = "-" if "app" not in d else ("app" if d["app"] else "navegador")
    equipo = " ".join(d.get(k, "-") for k in ("device", "os", "browser"))
    print(d["ts"], d["slug"], d["name"], EVENTOS.get(d.get("ev", "open"), d.get("ev")), modo, equipo, sep="\t")
'
