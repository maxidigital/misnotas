import express from 'express';
import { readFile, writeFile, readdir, mkdir, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = process.env.DATA_DIR || '/data';
const PUBLISHED_DIR = path.join(DATA_DIR, 'published');
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'dev';
const PORT = process.env.PORT || 3001;

await mkdir(DATA_DIR, { recursive: true });
await mkdir(PUBLISHED_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '16mb' }));

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

/* ---------- publicaciones (slug -> guía; HTML final en DATA_DIR/published/<slug>.html) ---------- */
const pubFileFor = (slug) => path.join(PUBLISHED_DIR, slug + '.html');
const PUBLICATIONS_FILE = path.join(DATA_DIR, '_publications.json');
async function readPublications() {
  try {
    return JSON.parse(await readFile(PUBLICATIONS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
async function writePublications(list) {
  const tmp = PUBLICATIONS_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(list, null, 2));
  await rename(tmp, PUBLICATIONS_FILE);
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

/* ---------- publicaciones ---------- */
app.get('/api/publications', requireAuth, async (_req, res) => res.json(await readPublications()));

app.post('/api/publications', requireAuth, async (req, res) => {
  const b = req.body || {};
  const slug = String(b.slug || '').trim();
  if (!validId(slug)) return res.status(400).json({ error: 'slug inválido' });
  if (typeof b.html !== 'string' || !b.html) return res.status(400).json({ error: 'html requerido' });
  const list = await readPublications();
  if (list.some((p) => p.slug === slug)) return res.status(409).json({ error: 'ese link ya existe' });
  const dest = pubFileFor(slug);
  const tmp = dest + '.tmp';
  await writeFile(tmp, b.html);
  await rename(tmp, dest);
  const now = new Date().toISOString();
  const pub = { slug, guideId: b.guideId || null, guideName: b.guideName || '', createdAt: now, updatedAt: now };
  list.push(pub);
  await writePublications(list);
  res.json(pub);
});

app.put('/api/publications/:slug', requireAuth, async (req, res) => {
  const slug = req.params.slug;
  if (!validId(slug)) return res.status(400).json({ error: 'bad slug' });
  const b = req.body || {};
  if (typeof b.html !== 'string' || !b.html) return res.status(400).json({ error: 'html requerido' });
  const list = await readPublications();
  const pub = list.find((p) => p.slug === slug);
  if (!pub) return res.status(404).json({ error: 'not found' });
  const dest = pubFileFor(slug);
  const tmp = dest + '.tmp';
  await writeFile(tmp, b.html);
  await rename(tmp, dest);
  if (b.guideId) pub.guideId = b.guideId;
  if (typeof b.guideName === 'string') pub.guideName = b.guideName;
  pub.updatedAt = new Date().toISOString();
  await writePublications(list);
  res.json(pub);
});

app.delete('/api/publications/:slug', requireAuth, async (req, res) => {
  const slug = req.params.slug;
  if (!validId(slug)) return res.status(400).json({ error: 'bad slug' });
  let list = await readPublications();
  list = list.filter((p) => p.slug !== slug);
  await writePublications(list);
  try {
    await unlink(pubFileFor(slug));
  } catch {
    /* ya no está */
  }
  res.json({ ok: true });
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

/* ---------- service worker de las guías (PWA / offline), scope /p/ ---------- */
const SW_JS = `
const CACHE = 'guia-v1';
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.indexOf('/p/') !== 0 || url.pathname === '/p/sw.js') return;
  e.respondWith(
    fetch(req).then(function(res){
      try { var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); } catch(_){}
      return res;
    }).catch(function(){ return caches.match(req); })
  );
});
`;
app.get('/p/sw.js', (_req, res) => {
  res.set('Service-Worker-Allowed', '/p/');
  res.type('application/javascript').send(SW_JS);
});

/* ---------- publicación pública (sin auth): /p/<slug> ---------- */
app.get('/p/:slug', async (req, res) => {
  if (!validId(req.params.slug)) return res.status(400).send('bad slug');
  const file = pubFileFor(req.params.slug);
  if (!existsSync(file)) return res.status(404).send('Publicación no encontrada');
  res.type('html').sendFile(file);
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
