#!/usr/bin/env bash
# Muestra quién abrió qué guía, cuándo, desde qué dispositivo, si fue desde la app
# instalada o el navegador y cuánto tiempo la tuvo a la vista; también cuándo la
# instalan (DATA_DIR/access-log.jsonl en el servidor). Lo que no se sabe sale con "-"
# (entradas anteriores a que se registrara ese dato).
# Requiere estar linkeado con `railway link` en este proyecto.
set -euo pipefail

railway ssh cat /data/access-log.jsonl | python3 -c '
import json, sys

entradas = []
for linea in sys.stdin:
    linea = linea.strip()
    if not linea:
        continue
    try:
        entradas.append(json.loads(linea))
    except ValueError:
        continue

# El lector manda el tiempo acumulado de cada ingreso varias veces: vale el mayor.
tiempo = {}
for d in entradas:
    if d.get("ev") == "time":
        tiempo[d["sid"]] = max(tiempo.get(d["sid"], 0), d["secs"])

def duracion(secs):
    if secs is None:
        return "-"
    if secs < 60:
        return "<1 min"
    h, m = divmod(secs // 60, 60)
    return "%d h %02d min" % (h, m) if h else "%d min" % m

for d in entradas:
    ev = d.get("ev", "open")
    if ev == "time":
        continue
    modo = "-" if "app" not in d else ("app instalada" if d["app"] else "navegador")
    equipo = " ".join(d.get(k, "-") for k in ("device", "os", "browser"))
    # Cada línea es un ingreso salvo que diga otra cosa al final (INSTALÓ).
    campos = [d["ts"], d["slug"], d["name"], modo, equipo]
    if ev == "open":
        campos.append(duracion(tiempo.get(d.get("sid"))))
    else:
        campos.append("INSTALÓ" if ev == "install" else ev)
    print(*campos, sep="\t")
'
