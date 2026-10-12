#!/usr/bin/env bash
# Muestra quién abrió qué guía, cuándo, desde qué dispositivo y si fue desde la app
# instalada o el navegador; también cuándo la instalan
# (DATA_DIR/access-log.jsonl en el servidor). Las entradas anteriores a que se
# registrara el dispositivo salen con "-".
# Requiere estar linkeado con `railway link` en este proyecto.
set -euo pipefail

railway ssh cat /data/access-log.jsonl | python3 -c '
import json, sys

for linea in sys.stdin:
    linea = linea.strip()
    if not linea:
        continue
    try:
        d = json.loads(linea)
    except ValueError:
        continue
    modo = "-" if "app" not in d else ("app instalada" if d["app"] else "navegador")
    equipo = " ".join(d.get(k, "-") for k in ("device", "os", "browser"))
    # Cada línea es un ingreso salvo que diga otra cosa al final (INSTALÓ).
    campos = [d["ts"], d["slug"], d["name"], modo, equipo]
    if d.get("ev", "open") != "open":
        campos.append("INSTALÓ" if d["ev"] == "install" else d["ev"])
    print(*campos, sep="\t")
'
