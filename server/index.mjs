import express from 'express';
import { readFile, writeFile, appendFile, readdir, mkdir, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendMail } from './mailer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = process.env.DATA_DIR || '/data';
const PUBLISHED_DIR = path.join(DATA_DIR, 'published');
const PORT = process.env.PORT || 3001;

// En producción no hay contraseña por defecto: sin AUTH_PASSWORD el servidor no arranca
// (si la variable se pierde en un deploy, es preferible caerse a quedar abierto con 'dev').
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'dev');
if (!AUTH_PASSWORD) {
  console.error('Falta AUTH_PASSWORD. Definila en el entorno antes de arrancar.');
  process.exit(1);
}

await mkdir(DATA_DIR, { recursive: true });
await mkdir(PUBLISHED_DIR, { recursive: true });

const app = express();

/* ---------- auth (contraseña compartida, en un header) ---------- */
// La vieja sigue entrando mientras esté definida, para no dejar a nadie afuera de golpe:
// cada vez que se usa llega un aviso por mail. Cuando dejen de llegar, se borra la variable.
const OLD_PASSWORD =
  process.env.AUTH_PASSWORD_OLD && process.env.AUTH_PASSWORD_OLD !== AUTH_PASSWORD
    ? process.env.AUTH_PASSWORD_OLD
    : '';

const PW = Buffer.from(AUTH_PASSWORD);
const PW_OLD = OLD_PASSWORD ? Buffer.from(OLD_PASSWORD) : null;

function sameAs(given, expected) {
  if (!expected) return false;
  const buf = Buffer.from(String(given || ''));
  // La longitud se compara antes porque timingSafeEqual exige buffers del mismo largo.
  return buf.length === expected.length && timingSafeEqual(buf, expected);
}

/** 'new' | 'old' | null */
function matchPassword(given) {
  if (sameAs(given, PW)) return 'new';
  if (sameAs(given, PW_OLD)) return 'old';
  return null;
}

/* ---------- aviso por mail cuando alguien entra con la contraseña vieja ---------- */
// Un aviso por dispositivo y por día: quien deja el editor abierto trabajando no genera
// más correos, pero si entra otra persona (u otro aparato) ese sí avisa.
const ALERT_EVERY_MS = 12 * 60 * 60 * 1000;
const alerted = new Map(); // dispositivo -> cuándo se avisó por última vez

/** IP del visitante. Detrás del proxy de Railway req.ip es el proxy, así que se mira la
 *  cabecera; es orientativa, el cliente puede falsearla. */
function clientIp(req) {
  const xff = String(req.get('x-forwarded-for') || '').split(',')[0].trim();
  return xff || req.ip || req.socket.remoteAddress || '?';
}

function notifyOldPassword(req) {
  const ip = clientIp(req);
  const ua = req.get('user-agent') || '?';
  const key = ip + ' | ' + ua;

  const now = Date.now();
  if (now - (alerted.get(key) || 0) < ALERT_EVERY_MS) return;
  if (alerted.size > 200) alerted.clear(); // techo de memoria
  alerted.set(key, now);

  const text = [
    'Alguien entró en misnotas con la contraseña VIEJA.',
    '',
    'Cuándo:     ' +
      new Date().toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        dateStyle: 'short',
        timeStyle: 'short',
      }) +
      ' (hora de Madrid)',
    'IP:         ' + ip + '  (orientativa)',
    'Navegador:  ' + ua,
    '',
    'La contraseña vieja sigue funcionando mientras AUTH_PASSWORD_OLD esté definida.',
    'Cuando dejen de llegar estos avisos, borrá esa variable del entorno.',
  ].join('\n');

  console.warn('[auth] acceso con la contraseña vieja desde', ip);
  sendMail({ subject: '[misnotas] Alguien entró con la contraseña vieja', text }).catch(() => {});
}

/* Freno al fuerza bruta: cada fallo demora la respuesta (100ms, 200ms, 400ms… hasta 2s).
   No bloquea, así que un atacante no puede dejar afuera al dueño; solo lo hace inviable. */
const fails = new Map(); // ip -> cantidad de fallos seguidos
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function requireAuth(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || '?';
  const match = matchPassword(req.get('x-app-password'));
  if (match) {
    fails.delete(ip);
    // Solo en /api/me, que es por donde se entra: el resto de las rutas son la sesión ya
    // empezada y avisarían decenas de veces. Sin await: el aviso no demora la respuesta.
    if (match === 'old' && req.path === '/me') notifyOldPassword(req);
    return next();
  }
  const n = (fails.get(ip) || 0) + 1;
  if (fails.size > 500) fails.clear(); // techo de memoria; el castigo se reinicia, no pasa nada
  fails.set(ip, n);
  await sleep(Math.min(2000, 100 * 2 ** (n - 1)));
  return res.status(401).json({ error: 'unauthorized' });
}

// Todo /api pide contraseña ANTES de parsear el body: sin credenciales no se puede
// hacer que el servidor parsee 16mb de JSON. Y nada de /api se cachea: sin esto la
// respuesta sale con ETag y sin Cache-Control, y el navegador puede mostrar una
// lista vieja después de guardar o publicar.
app.use(
  '/api',
  (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  },
  requireAuth,
  express.json({ limit: '16mb' })
);

app.get('/api/me', (_req, res) => res.json({ ok: true }));

/* ---------- guías (1 JSON por guía en DATA_DIR) ---------- */
const ID_RE = /^[a-z0-9-]+$/;
const validId = (id) => typeof id === 'string' && ID_RE.test(id) && id.length <= 100;
const fileFor = (id) => path.join(DATA_DIR, id + '.json');
const newId = () => 'g-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Forma mínima aceptable de una guía. Esto es lo único que protege al único lugar
 *  donde vive el contenido: sin este chequeo, un body vacío o roto pisa la guía entera. */
function validProject(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  if (!Array.isArray(p.sections)) return false;
  return p.sections.every((s) => s && typeof s === 'object' && !Array.isArray(s) && Array.isArray(s.folios));
}

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
const ACCESS_LOG_FILE = path.join(DATA_DIR, 'access-log.jsonl');
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

app.get('/api/guides', async (_req, res) => {
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
app.get('/api/publications', async (_req, res) => res.json(await readPublications()));

app.post('/api/publications', async (req, res) => {
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

app.put('/api/publications/:slug', async (req, res) => {
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

app.delete('/api/publications/:slug', async (req, res) => {
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

app.get('/api/guides/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  try {
    res.json(await readGuide(req.params.id));
  } catch {
    res.status(404).json({ error: 'not found' });
  }
});

app.post('/api/guides', async (req, res) => {
  const project = req.body || {};
  if (!validProject(project)) return res.status(400).json({ error: 'guía inválida' });
  // Se respeta el id que venga solo si está libre: crear no puede pisar una guía existente.
  const id = validId(project.id) && !existsSync(fileFor(project.id)) ? project.id : newId();
  const now = new Date().toISOString();
  const toSave = { ...project, id, folderId: project.folderId ?? null, createdAt: project.createdAt || now, updatedAt: now };
  await writeGuide(id, toSave);
  res.json(toSave);
});

/* PATCH: cambios de metadatos sin mandar el proyecto entero (renombrar / mover). */
app.patch('/api/guides/:id', async (req, res) => {
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

app.put('/api/guides/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  const body = req.body || {};
  if (!validProject(body)) return res.status(400).json({ error: 'guía inválida' });
  let prev;
  try {
    prev = await readGuide(req.params.id);
  } catch {
    return res.status(404).json({ error: 'not found' }); // guardar no crea guías
  }
  // El editor manda el contenido; la ubicación y el alta las manda el servidor. Así un
  // editor abierto hace rato no revierte un "mover a carpeta" hecho desde el dashboard.
  const toSave = {
    ...body,
    id: req.params.id,
    folderId: prev.folderId ?? null,
    createdAt: prev.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeGuide(req.params.id, toSave);
  res.json({ ok: true, updatedAt: toSave.updatedAt });
});

app.delete('/api/guides/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  try {
    await unlink(fileFor(req.params.id));
  } catch {
    /* ya no existe */
  }
  res.json({ ok: true });
});

/* ---------- carpetas ---------- */
app.get('/api/folders', async (_req, res) => res.json(await readFolders()));

app.post('/api/folders', async (req, res) => {
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

app.patch('/api/folders/:id', async (req, res) => {
  const folders = await readFolders();
  const f = folders.find((x) => x.id === req.params.id);
  if (!f) return res.status(404).json({ error: 'not found' });
  if (typeof req.body?.name === 'string') f.name = req.body.name.trim() || f.name;
  if ('parentId' in (req.body || {})) f.parentId = req.body.parentId || null;
  await writeFolders(folders);
  res.json(f);
});

app.delete('/api/folders/:id', async (req, res) => {
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
const CACHE = 'guia-v3';
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('message', function(e){
  if(e.data === 'skipWaiting') self.skipWaiting();
  if(e.data === 'clearCache'){ caches.keys().then(function(ks){ ks.forEach(function(k){ caches.delete(k); }); }); }
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.indexOf('/p/') !== 0 || url.pathname === '/p/sw.js') return;
  // /p/<slug>/ver es el número de versión: se pide a mano y no tiene sentido cachearlo.
  if(url.pathname.slice(-4) === '/ver' && url.pathname.split('/').length === 4) return;
  // Network-first bypassing the HTTP cache (iOS standalone la cachea agresivamente);
  // la copia offline vive solo en CacheStorage. Se guarda bajo el pathname (sin query)
  // para que los reloads con ?v=... no dejen una entrada nueva cada vez.
  e.respondWith(
    fetch(url.pathname, { cache: 'no-store', credentials: 'same-origin' }).then(function(res){
      try { var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(url.pathname, copy); }); } catch(_){}
      return res;
    }).catch(function(){ return caches.match(url.pathname); })
  );
});
`;
app.get('/p/sw.js', (_req, res) => {
  res.set('Service-Worker-Allowed', '/p/');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.type('application/javascript').send(SW_JS);
});

/* Versión publicada, en unos pocos bytes. El número vive dentro del HTML de la guía; sin
   esto el lector tiene que bajarse la guía entera solo para comparar. Público, como la guía. */
app.get('/p/:slug/ver', async (req, res) => {
  if (!validId(req.params.slug)) return res.status(400).send('');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const html = await readFile(pubFileFor(req.params.slug), 'utf8');
    const m = html.match(/var GUIDE_VER = "([^"]+)"/);
    res.type('text/plain').send(m ? m[1] : '');
  } catch {
    res.status(404).type('text/plain').send('');
  }
});

/* Seguimiento de uso: quién abrió qué guía y cuándo. Público, sin auth (como el
   resto de /p/*); body chico propio porque el express.json() global solo está
   montado bajo /api. Nunca debe cortarle la experiencia al lector: siempre
   responde ok, incluso si falla el guardado. */
app.post('/p/:slug/track', express.json({ limit: '2kb' }), async (req, res) => {
  if (!validId(req.params.slug)) return res.status(400).json({ error: 'bad slug' });
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
  if (name) {
    const entry = { ts: new Date().toISOString(), slug: req.params.slug, name };
    appendFile(ACCESS_LOG_FILE, JSON.stringify(entry) + '\n', 'utf8').catch(() => {});
  }
  res.json({ ok: true });
});

/* ---------- publicación pública (sin auth): /p/<slug> ---------- */
app.get('/p/:slug', async (req, res) => {
  if (!validId(req.params.slug)) return res.status(400).send('bad slug');
  const file = pubFileFor(req.params.slug);
  if (!existsSync(file)) return res.status(404).send('Publicación no encontrada');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.type('html').sendFile(file, { cacheControl: false, etag: false, lastModified: false });
});

/* ---------- guía de uso para alumnos ---------- */
app.get('/ayuda', (_req, res) => {
  res.type('html').sendFile(path.join(__dirname, 'ayuda.html'));
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
