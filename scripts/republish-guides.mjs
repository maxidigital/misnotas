#!/usr/bin/env node
// Reproduce lo que hace el botón "Actualizar" del editor (PublishButton.tsx) pero para
// TODAS las publicaciones existentes, desde la terminal: recompila buildGuide.ts con la
// versión actual del código, y reescribe el HTML de cada publicación ya creada.
//
// Uso:
//   AUTH_PASSWORD=... node scripts/republish-guides.mjs [slug ...]
//   (sin slugs: republica todas las publicaciones que existan)
//
// BASE_URL por defecto apunta a producción; se puede pisar con BASE_URL=http://localhost:3001.

import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'https://misnotas.up.railway.app';
const PW = process.env.AUTH_PASSWORD;
if (!PW) {
  console.error('Falta AUTH_PASSWORD en el entorno.');
  process.exit(1);
}

async function api(path_, opts = {}) {
  const res = await fetch(BASE_URL + '/api' + path_, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-app-password': PW, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error('API ' + res.status + ' en ' + path_);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Compila buildGuide.ts (y lo que importa) a un módulo Node de un solo archivo, en un
 *  directorio temporal, para poder usar renderGuideHtml() sin levantar Vite/React. */
async function loadRenderer() {
  const tmp = await mkdtemp(path.join(tmpdir(), 'misnotas-republish-'));
  const outfile = path.join(tmp, 'buildGuide.mjs');
  await build({
    entryPoints: [path.join(ROOT, 'src/features/editor/buildGuide.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    alias: { '@': path.join(ROOT, 'src') },
    logLevel: 'silent',
  });
  const mod = await import('file://' + outfile);
  return { renderGuideHtml: mod.renderGuideHtml, cleanup: () => rm(tmp, { recursive: true, force: true }) };
}

async function main() {
  const onlySlugs = process.argv.slice(2);
  const { renderGuideHtml, cleanup } = await loadRenderer();
  try {
    const pubs = (await api('/publications')).filter((p) => p.guideId && (onlySlugs.length === 0 || onlySlugs.includes(p.slug)));
    if (pubs.length === 0) {
      console.log('Nada para republicar.');
      return;
    }
    const guideCache = new Map();
    let done = 0;
    for (const pub of pubs) {
      let project = guideCache.get(pub.guideId);
      if (!project) {
        try {
          project = await api('/guides/' + pub.guideId);
        } catch {
          console.warn('  guía ' + pub.guideId + ' (para /p/' + pub.slug + ') ya no existe, se omite');
          continue;
        }
        guideCache.set(pub.guideId, project);
      }
      const html = renderGuideHtml(project);
      await api('/publications/' + pub.slug, {
        method: 'PUT',
        body: JSON.stringify({ guideId: pub.guideId, guideName: project.name || '', html }),
      });
      console.log('  /p/' + pub.slug + ' -> actualizada (' + (project.name || 'sin nombre') + ')');
      done++;
    }
    console.log(done + ' de ' + pubs.length + ' publicación(es) actualizada(s).');
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
