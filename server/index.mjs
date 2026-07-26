import express from 'express';
import { readFile, writeFile, readdir, mkdir, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = process.env.DATA_DIR || '/data';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'dev';
const PORT = process.env.PORT || 3001;

await mkdir(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '8mb' }));

/* ---------- auth (placeholder muy simple: una contraseña en header) ---------- */
function requireAuth(req, res, next) {
  if (req.get('x-app-password') === AUTH_PASSWORD) return next();
  return res.status(401).json({ error: 'unauthorized' });
}
app.get('/api/me', requireAuth, (_req, res) => res.json({ ok: true }));

/* ---------- guías (1 JSON por guía en DATA_DIR) ---------- */
const ID_RE = /^[a-z0-9-]+$/;
const validId = (id) => typeof id === 'string' && ID_RE.test(id) && id.length <= 100;
const fileFor = (id) => path.join(DATA_DIR, id + '.json');
const newId = () => 'g-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

async function readGuide(id) {
  return JSON.parse(await readFile(fileFor(id), 'utf8'));
}
async function writeGuide(id, project) {
  const tmp = fileFor(id) + '.tmp';
  await writeFile(tmp, JSON.stringify(project, null, 2));
  await rename(tmp, fileFor(id)); // escritura atómica
}

/* ---------- carpetas (registro en _folders.json) ---------- */
const FOLDERS_FILE = path.join(DATA_DIR, '_folders.json');
const newFolderId = () => 'f-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
async function readFolders() {
  try {
    return JSON.parse(await readFile(FOLDERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
async function writeFolders(list) {
  const tmp = FOLDERS_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(list, null, 2));
  await rename(tmp, FOLDERS_FILE);
}

app.get('/api/guides', requireAuth, async (_req, res) => {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const list = [];
  for (const f of files) {
    try {
      const p = JSON.parse(await readFile(path.join(DATA_DIR, f), 'utf8'));
      list.push({
        id: p.id,
        name: p.name,
        folderId: p.folderId ?? null,
        updatedAt: p.updatedAt,
        sections: (p.sections || []).length,
        folios: (p.sections || []).reduce((a, s) => a + (s.folios || []).length, 0),
      });
    } catch {
      /* ignorar archivos corruptos */
    }
  }
  list.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  res.json(list);
});

app.get('/api/guides/:id', requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  try {
    res.json(await readGuide(req.params.id));
  } catch {
    res.status(404).json({ error: 'not found' });
  }
});

app.post('/api/guides', requireAuth, async (req, res) => {
  const project = req.body || {};
  const id = validId(project.id) ? project.id : newId();
  const now = new Date().toISOString();
  const toSave = { ...project, id, folderId: project.folderId ?? null, createdAt: project.createdAt || now, updatedAt: now };
  await writeGuide(id, toSave);
  res.json(toSave);
});

/* PATCH: cambios de metadatos sin mandar el proyecto entero (renombrar / mover). */
app.patch('/api/guides/:id', requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  let p;
  try {
    p = await readGuide(req.params.id);
  } catch {
    return res.status(404).json({ error: 'not found' });
  }
  const b = req.body || {};
  if (typeof b.name === 'string') p.name = b.name;
  if ('folderId' in b) p.folderId = b.folderId || null;
  p.updatedAt = new Date().toISOString();
  await writeGuide(req.params.id, p);
  res.json({ id: p.id, name: p.name, folderId: p.folderId ?? null, updatedAt: p.updatedAt });
});

app.put('/api/guides/:id', requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  const toSave = { ...(req.body || {}), id: req.params.id, updatedAt: new Date().toISOString() };
  await writeGuide(req.params.id, toSave);
  res.json({ ok: true, updatedAt: toSave.updatedAt });
});

app.delete('/api/guides/:id', requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  try {
    await unlink(fileFor(req.params.id));
  } catch {
    /* ya no existe */
  }
  res.json({ ok: true });
});

/* ---------- carpetas ---------- */
app.get('/api/folders', requireAuth, async (_req, res) => res.json(await readFolders()));

app.post('/api/folders', requireAuth, async (req, res) => {
  const folders = await readFolders();
  const f = {
    id: newFolderId(),
    name: String(req.body?.name || 'Carpeta').trim() || 'Carpeta',
    parentId: req.body?.parentId || null,
  };
  folders.push(f);
  await writeFolders(folders);
  res.json(f);
});

app.patch('/api/folders/:id', requireAuth, async (req, res) => {
  const folders = await readFolders();
  const f = folders.find((x) => x.id === req.params.id);
  if (!f) return res.status(404).json({ error: 'not found' });
  if (typeof req.body?.name === 'string') f.name = req.body.name.trim() || f.name;
  if ('parentId' in (req.body || {})) f.parentId = req.body.parentId || null;
  await writeFolders(folders);
  res.json(f);
});

app.delete('/api/folders/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  let folders = await readFolders();
  const target = folders.find((x) => x.id === id);
  const parent = target ? target.parentId || null : null;
  // reparent subcarpetas al padre del borrado
  folders.forEach((x) => {
    if (x.parentId === id) x.parentId = parent;
  });
  folders = folders.filter((x) => x.id !== id);
  await writeFolders(folders);
  // reparent guías de esa carpeta al padre
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  for (const file of files) {
    try {
      const p = JSON.parse(await readFile(path.join(DATA_DIR, file), 'utf8'));
      if ((p.folderId || null) === id) {
        p.folderId = parent;
        await writeGuide(p.id, p);
      }
    } catch {
      /* ignorar */
    }
  }
  res.json({ ok: true });
});

/* ---------- SPA estática ---------- */
app.use(express.static(DIST));
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not found' });
  const index = path.join(DIST, 'index.html');
  if (existsSync(index)) return res.sendFile(index);
  return res.status(404).send('Not found');
});

/* ---------- seed si el volumen está vacío ---------- */
async function seedIfEmpty() {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  if (files.length > 0) return;
  try {
    const seed = JSON.parse(await readFile(path.join(__dirname, 'seed.json'), 'utf8'));
    const id = validId(seed.id) ? seed.id : newId();
    await writeGuide(id, { ...seed, id });
    console.log('Seeded initial guide:', seed.name);
  } catch (e) {
    console.warn('seed skipped:', e.message);
  }
}
await seedIfEmpty();

app.listen(PORT, () => console.log(`misnotas server on :${PORT} (data: ${DATA_DIR})`));
