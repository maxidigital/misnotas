import type { Project } from '@/types';
import { bandColors } from './previewFolio';
import { LOGO } from '@/logo';

/** Reader runtime (vanilla). Navigation via data-go / data-kind+data-id, plus a
 *  finger-following horizontal carousel (prev | current | next) for folios. */
const RUNTIME = `
var crumbs = document.getElementById('crumbs');
var pagenav = document.getElementById('pagenav');
var viewport = document.querySelector('.viewport');
var track = document.getElementById('track');
var histPanel = document.getElementById('history');
var histBackdrop = document.getElementById('histBackdrop');
var brandLogo = document.getElementById('brandLogo');
var settings = document.getElementById('settings');
function esc(t){ return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function sectionById(id){ for(var i=0;i<GUIDE.sections.length;i++){ if(GUIDE.sections[i].id===id) return GUIDE.sections[i]; } return null; }
function findFolio(id){
  for(var i=0;i<GUIDE.sections.length;i++){
    var s=GUIDE.sections[i];
    for(var j=0;j<s.folios.length;j++){ if(s.folios[j].id===id) return { section:s, folio:s.folios[j], index:j }; }
  }
  return null;
}
/* Orden lineal de TODOS los folios (a lo largo de las secciones): {s,f}. */
var FLAT = [];
GUIDE.sections.forEach(function(s){ s.folios.forEach(function(f){ FLAT.push({ s:s, f:f }); }); });
function flatIndex(id){ for(var k=0;k<FLAT.length;k++){ if(FLAT[k].f.id===id) return k; } return -1; }
function currentFolioId(){ var p=(location.hash||'').replace(/^#/,'').split('/').filter(Boolean); return (p[0]==='f'&&p[1])?p[1]:null; }
function goRel(delta){
  var id=currentFolioId(); if(!id) return;
  var gi=flatIndex(id); if(gi<0) return;
  var t=gi+delta; if(t<0||t>=FLAT.length) return;
  location.hash='#/f/'+FLAT[t].f.id;
}

/* ---- historial ---- */
var HIST = [];
function pageLabel(hash){
  var parts=(hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(parts[0]==='f' && parts[1]){ var r=findFolio(parts[1]); return r ? (r.folio.title||'(sin t\\u00edtulo)') : 'Folio'; }
  if(parts[0]==='s' && parts[1]){ var s=sectionById(parts[1]); return s ? s.name : 'Secci\\u00f3n'; }
  return '\\u2302 Inicio';
}
function pushHist(hash){
  hash = hash || '#/';
  if(hash==='#/' || hash==='#') return;   // no guardar Inicio en la sesión
  HIST = HIST.filter(function(h){ return h.hash!==hash; });
  HIST.unshift({ hash: hash, label: pageLabel(hash) });
  if(HIST.length>50) HIST.length=50;
}
function renderHistory(){
  if(!histPanel) return;
  var cur = location.hash || '#/';
  var html = '<div class="hist-title">Sesi\\u00f3n</div>';
  html += HIST.map(function(h){
    return '<button class="hist-item'+(h.hash===cur?' cur':'')+'" data-go="'+h.hash+'">'+esc(h.label)+'</button>';
  }).join('');
  histPanel.innerHTML = html;
}
function openHist(){ if(histPanel) histPanel.classList.add('open'); if(histBackdrop) histBackdrop.classList.add('open'); }
function closeHist(){ if(histPanel) histPanel.classList.remove('open'); if(histBackdrop) histBackdrop.classList.remove('open'); }

/* ---- breadcrumb + card helpers ---- */
function crumbLink(label, go){ return '<button class="crumb" data-go="'+go+'">'+esc(label)+'</button>'; }
function crumbCur(label){ return '<span class="crumb cur">'+esc(label)+'</span>'; }
function crumbHome(current){ return current ? '<span class="crumb cur">\\u2302 Inicio</span>' : '<button class="crumb" data-go="#/">\\u2302 Inicio</button>'; }
function csep(){ return '<span class="csep">\\u203a</span>'; }
function scard(go, label, sub, cls){
  return '<button class="scard '+(cls||'')+'" data-go="'+go+'"><span class="scard-main">'
    + esc(label) + (sub?'<small>'+esc(sub)+'</small>':'')
    + '</span><span class="scard-arrow">\\u203a</span></button>';
}

/* ---- content builders (return inner HTML of a .wrap sheet) ---- */
function menuInner(){
  var main = GUIDE.sections.filter(function(s){ return s.type!=='apendice'; });
  var apx = GUIDE.sections.filter(function(s){ return s.type==='apendice'; });
  var html = '<div class="menuhead"><img class="menu-logo" src="'+LOGO+'" alt=""><div class="menu-title">'+esc(GUIDE.name||'Gu\\u00eda')+'</div></div>';
  html += '<div class="grid">' + main.map(function(s){ return scard('#/s/'+s.id, s.name, s.folios.length+' folios', 'band-'+s.id); }).join('') + '</div>';
  if(apx.length) html += '<div class="group">Ap\\u00e9ndices</div><div class="grid">' + apx.map(function(s){ return scard('#/s/'+s.id, s.name, s.folios.length+' folios', 'band-'+s.id); }).join('') + '</div>';
  return html;
}
function sectionInner(s){
  return '<h1 class="band band-'+s.id+'">'+esc(s.name)+'</h1>'
    + '<div class="grid">' + s.folios.map(function(f){ return scard('#/f/'+f.id, f.title||'(sin t\\u00edtulo)'); }).join('') + '</div>';
}
function folioInner(f, s){
  return '<h1 class="band band-'+s.id+'">'+esc(f.title||'')+'</h1>'
    + '<div class="body">'+(f.body||'')+'</div>';
}
function pageFolio(item){ return '<div class="page">'+(item?'<div class="wrap">'+folioInner(item.f,item.s)+'</div>':'')+'</div>'; }

/* ---- track layout ---- */
function setSingle(inner){
  track.classList.remove('anim');
  track.innerHTML = '<div class="page"><div class="wrap">'+inner+'</div></div>';
  track.style.transform = 'translateX(0px)';
}
function setFolioTriple(gi){
  var W = viewport.clientWidth;
  track.classList.remove('anim');
  track.innerHTML = pageFolio(gi>0?FLAT[gi-1]:null) + pageFolio(FLAT[gi]) + pageFolio(gi<FLAT.length-1?FLAT[gi+1]:null);
  track.style.transform = 'translateX('+(-W)+'px)';
}

/* ---- render ---- */
function renderMenu(){ crumbs.innerHTML = ''; setSingle(menuInner()); pagenav.className='pagenav'; pagenav.innerHTML=''; }
function renderSection(id){
  var s = sectionById(id); if(!s) return renderMenu();
  crumbs.innerHTML = crumbHome(false);
  setSingle(sectionInner(s)); pagenav.className='pagenav'; pagenav.innerHTML='';
}
function renderFolio(id){
  var r = findFolio(id); if(!r) return renderMenu();
  var s = r.section, f = r.folio, gi = flatIndex(f.id);
  crumbs.innerHTML = crumbHome(false)+csep()+crumbLink(s.name,'#/s/'+s.id);
  setFolioTriple(gi);
  var prev = gi>0 ? FLAT[gi-1].f : null;
  var next = gi<FLAT.length-1 ? FLAT[gi+1].f : null;
  var chevL = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  var chevR = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  var prevBtn = '<button class="nav-side" aria-label="Anterior" '+(prev?'data-go="#/f/'+prev.id+'"':'disabled')+'>'+chevL+'</button>';
  var nextBtn = '<button class="nav-next" aria-label="Siguiente" '+(next?'data-go="#/f/'+next.id+'"':'disabled')+'>'+chevR+'</button>';
  var links = (f.links||[]).slice(0,3);
  if(links.length){
    var acts = links.map(function(l){
      return '<button class="linkbtn" data-kind="'+l.target.kind+'" data-id="'+l.target.id+'">'+esc(l.label||'Ir')+'</button>';
    }).join('');
    pagenav.className = 'pagenav has-acts';
    pagenav.innerHTML = prevBtn + '<div class="pageacts">'+acts+'</div>' + nextBtn;
  } else {
    pagenav.className = 'pagenav';
    pagenav.innerHTML = prevBtn + nextBtn;
  }
}
function render(){
  pushHist(location.hash || '#/');
  renderHistory();
  var parts = (location.hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(parts[0]==='f' && parts[1]) return renderFolio(parts[1]);
  if(parts[0]==='s' && parts[1]) return renderSection(parts[1]);
  return renderMenu();
}

/* ---- click navigation ---- */
if(histBackdrop) histBackdrop.addEventListener('click', closeHist);
document.addEventListener('click', function(e){
  var g = e.target.closest('[data-go]');
  if(g){ location.hash = g.getAttribute('data-go'); closeHist(); return; }
  var a = e.target.closest('a.internal-link, [data-kind][data-id]');
  if(a){
    e.preventDefault();
    var k = a.getAttribute('data-kind'), id = a.getAttribute('data-id');
    if(id){ location.hash = (k==='section'?'#/s/':'#/f/') + id; closeHist(); }
  }
});
document.addEventListener('keydown', function(e){
  if(e.key==='Escape') closeHist();
  if(!currentFolioId()) return;
  if(e.key==='ArrowLeft') goRel(-1);
  if(e.key==='ArrowRight') goRel(1);
});

/* ---- finger-following swipe carousel + tap "kindle" a la izquierda para el historial ---- */
var sx=0, sy=0, W=0, axis=null, dragging=false, swipable=false, hasPrev=false, hasNext=false, gi0=0, pendingHash=null;
var startLeft=false, moved=false;
function drawerMode(){ return window.matchMedia('(max-width: 899px)').matches; }
viewport.addEventListener('touchstart', function(e){
  if(e.touches.length!==1){ swipable=false; return; }
  axis=null; dragging=false; pendingHash=null; moved=false;
  var id=currentFolioId(); swipable=!!id;
  sx=e.touches[0].clientX; sy=e.touches[0].clientY;
  var vr=viewport.getBoundingClientRect();
  startLeft=(sx-vr.left) < Math.max(56, vr.width*0.18);
  if(swipable){ gi0=flatIndex(id); hasPrev=gi0>0; hasNext=gi0<FLAT.length-1; W=viewport.clientWidth; track.classList.remove('anim'); }
}, {passive:true});
viewport.addEventListener('touchmove', function(e){
  var dx=e.touches[0].clientX-sx, dy=e.touches[0].clientY-sy;
  if(Math.abs(dx)>10 || Math.abs(dy)>10) moved=true;
  if(!swipable) return;
  if(axis===null){ if(Math.abs(dx)<8 && Math.abs(dy)<8) return; axis = Math.abs(dx)>Math.abs(dy) ? 'x' : 'y'; }
  if(axis!=='x') return;               // vertical → dejar el scroll normal
  e.preventDefault(); dragging=true;
  var d=dx; if((d>0&&!hasPrev)||(d<0&&!hasNext)) d*=0.28;   // resistencia en los extremos
  track.style.transform = 'translateX('+(-W+d)+'px)';
}, {passive:false});
viewport.addEventListener('touchend', function(e){
  // tap (sin arrastrar) en la banda izquierda → abrir el historial
  if(!moved && startLeft && drawerMode() && !(histPanel && histPanel.classList.contains('open'))
     && !e.target.closest('a, button')){
    openHist(); dragging=false; return;
  }
  if(!swipable || !dragging){ dragging=false; return; }
  dragging=false;
  var dx=e.changedTouches[0].clientX-sx;
  var TH=Math.max(90, W*0.70);
  track.classList.add('anim');
  if(dx<=-TH && hasNext){ track.style.transform='translateX('+(-2*W)+'px)'; pendingHash='#/f/'+FLAT[gi0+1].f.id; }
  else if(dx>=TH && hasPrev){ track.style.transform='translateX(0px)'; pendingHash='#/f/'+FLAT[gi0-1].f.id; }
  else { track.style.transform='translateX('+(-W)+'px)'; pendingHash=null; }
}, {passive:true});
track.addEventListener('transitionend', function(e){
  if(e.propertyName!=='transform') return;
  if(pendingHash){ var h=pendingHash; pendingHash=null; if(location.hash!==h) location.hash=h; }
});
/* Recentrar sin reconstruir (evita saltos al mostrarse/ocultarse la barra del navegador). */
window.addEventListener('resize', function(){
  if(currentFolioId()){ track.classList.remove('anim'); track.style.transform='translateX('+(-viewport.clientWidth)+'px)'; }
});

/* ---- ajustes: tema (claro/oscuro/auto) + tamaño de letra ---- */
var root = document.documentElement;
var FS = 1.5;
function currentTheme(){ return root.getAttribute('data-theme') || 'auto'; }
function syncSettings(){
  if(!settings) return;
  var t=currentTheme(), bs=settings.querySelectorAll('[data-theme]');
  for(var i=0;i<bs.length;i++){ bs[i].classList.toggle('active', bs[i].getAttribute('data-theme')===t); }
}
function applyTheme(t){
  if(t==='light'||t==='dark'){ root.setAttribute('data-theme', t); } else { root.removeAttribute('data-theme'); t='auto'; }
  try{ localStorage.setItem('reader.theme', t); }catch(e){}
  syncSettings();
}
function applyFS(v){
  FS = Math.max(1.0, Math.min(2.3, Math.round(v*10)/10));
  root.style.setProperty('--fs', FS+'rem');
  try{ localStorage.setItem('reader.fs', String(FS)); }catch(e){}
}
try{ var _t=localStorage.getItem('reader.theme'); if(_t==='light'||_t==='dark') root.setAttribute('data-theme', _t); }catch(e){}
try{ var _f=parseFloat(localStorage.getItem('reader.fs')); if(_f) applyFS(_f); }catch(e){}
syncSettings();
if(brandLogo) brandLogo.addEventListener('click', function(e){ e.stopPropagation(); if(settings){ settings.hidden=!settings.hidden; syncSettings(); } });
if(settings) settings.addEventListener('click', function(e){
  e.stopPropagation();
  var t=e.target.closest('[data-theme]'); if(t){ applyTheme(t.getAttribute('data-theme')); return; }
  var f=e.target.closest('[data-fs]'); if(f){ applyFS(FS + (f.getAttribute('data-fs')==='+'?0.1:-0.1)); return; }
});
document.addEventListener('click', function(e){
  if(settings && !settings.hidden && e.target!==brandLogo && !settings.contains(e.target)) settings.hidden=true;
});

window.addEventListener('hashchange', render);
render();
`;

function css(width: string): string {
  return `
  :root {
    color-scheme: light dark;
    --bg:#ECE3D2; --fg:#2A2620;
    --bar:#E3D8C4; --bar-bd:rgba(120,105,80,.24);
    --hover:rgba(120,105,80,.15);
    --sheet:#FBF7EE; --sheet-bd:rgba(120,105,80,.16);
    --sheet-sh:0 1px 2px rgba(70,55,30,.05), 0 10px 30px rgba(70,55,30,.07);
    --card:#FEFCF7; --card-bd:rgba(120,105,80,.20); --card-bd-h:rgba(120,105,80,.42);
    --card-sh:0 4px 14px rgba(70,55,30,.10);
    --btn:#FBF7EE; --btn-bd:rgba(120,105,80,.28); --btn-bd-strong:rgba(120,105,80,.5);
    --link:#4A6B57; --logo-invert:0; --fs:1.5rem;
  }
  /* variables de tema oscuro (reutilizadas por auto y por override manual) */
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg:#15161A; --fg:#E7E5E0;
      --bar:#1E2026; --bar-bd:rgba(255,255,255,.08);
      --hover:rgba(255,255,255,.09);
      --sheet:#23262C; --sheet-bd:rgba(255,255,255,.06);
      --sheet-sh:0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.28);
      --card:#2A2D34; --card-bd:rgba(255,255,255,.08); --card-bd-h:rgba(255,255,255,.20);
      --card-sh:0 4px 14px rgba(0,0,0,.35);
      --btn:#2A2D34; --btn-bd:rgba(255,255,255,.10); --btn-bd-strong:rgba(255,255,255,.24);
      --link:#89A995; --logo-invert:1;
    }
  }
  :root[data-theme="dark"] {
    --bg:#15161A; --fg:#E7E5E0;
    --bar:#1E2026; --bar-bd:rgba(255,255,255,.08);
    --hover:rgba(255,255,255,.09);
    --sheet:#23262C; --sheet-bd:rgba(255,255,255,.06);
    --sheet-sh:0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.28);
    --card:#2A2D34; --card-bd:rgba(255,255,255,.08); --card-bd-h:rgba(255,255,255,.20);
    --card-sh:0 4px 14px rgba(0,0,0,.35);
    --btn:#2A2D34; --btn-bd:rgba(255,255,255,.10); --btn-bd-strong:rgba(255,255,255,.24);
    --link:#89A995; --logo-invert:1;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 1.5rem; line-height: 1.55;
  }

  /* Top bar */
  .topbar {
    position: relative;
    flex-shrink: 0; display: flex; align-items: center; gap: 12px;
    background: var(--bar); border-bottom: 1px solid var(--bar-bd);
    padding: 8px 16px; font-size: 1rem;
  }
  .topbar .brand-logo { height: 26px; width: 26px; object-fit: contain; cursor: pointer; flex-shrink: 0; filter: invert(var(--logo-invert)); }
  .crumbs { flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; overflow: hidden; white-space: nowrap; }
  .crumb {
    cursor: pointer; border: none; background: transparent; color: inherit;
    font-size: 1rem; font-family: inherit; padding: 4px 8px; border-radius: 8px;
    max-width: 42vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .crumb:not(.cur):hover { background: var(--hover); }
  .crumb.cur { font-weight: 700; cursor: default; flex-shrink: 1; }
  .crumb:not(.cur) { opacity: .82; flex-shrink: 0; }
  .csep { opacity: .4; font-size: 1rem; flex-shrink: 0; }

  /* Menú de ajustes (tema + tamaño de letra) */
  .settings {
    position: absolute; z-index: 40; top: calc(100% + 6px); left: 12px;
    background: var(--bar); border: 1px solid var(--bar-bd); border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,.25); padding: 8px; min-width: 210px;
    display: flex; flex-direction: column; gap: 6px; font-size: 1rem;
  }
  .settings[hidden] { display: none; }
  .set-label { opacity: .55; font-size: .72rem; text-transform: uppercase; letter-spacing: .5px; margin: 2px 4px 0; }
  .set-row { display: flex; align-items: center; gap: 6px; }
  .settings button {
    cursor: pointer; border: 1px solid var(--btn-bd); background: var(--btn); color: inherit;
    border-radius: 8px; padding: 8px 10px; font-family: inherit; font-size: .95rem; flex: 1;
  }
  .settings button.active { border-color: var(--btn-bd-strong); font-weight: 700; }
  .set-row.set-fs button { flex: 0 0 auto; width: 46px; font-size: 1.05rem; }

  /* Stage: panel de historial + viewport */
  .stage { position: relative; flex: 1; display: flex; min-height: 0; }
  .history {
    position: absolute; z-index: 20; top: 0; bottom: 0; left: 0;
    width: 80%; max-width: 320px;
    background: var(--bar); border-right: 1px solid var(--bar-bd);
    overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 8px;
    transform: translateX(-100%); transition: transform .24s ease;
  }
  .history.open { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,.28); }
  .hist-backdrop { position: absolute; inset: 0; z-index: 15; background: rgba(0,0,0,.35); opacity: 0; pointer-events: none; transition: opacity .24s; }
  .hist-backdrop.open { opacity: 1; pointer-events: auto; }
  .hist-title { font-size: .82rem; text-transform: uppercase; letter-spacing: .5px; opacity: .55; padding: 8px 10px 4px; }
  .hist-item {
    display: block; width: 100%; text-align: left; cursor: pointer;
    border: none; background: transparent; color: inherit; font-family: inherit;
    font-size: 1rem; padding: 10px; border-radius: 8px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .hist-item:hover { background: var(--hover); }
  .hist-item.cur { font-weight: 700; }
  @media (min-width: 900px) {
    .history { position: static; transform: none; width: 260px; max-width: 260px; box-shadow: none; flex-shrink: 0; }
    .hist-backdrop { display: none; }
  }

  /* Carousel viewport + track (prev | current | next) */
  .viewport { flex: 1; overflow: hidden; position: relative; }
  .track { display: flex; height: 100%; will-change: transform; }
  .track.anim { transition: transform .28s cubic-bezier(.22,.61,.36,1); }
  .page { flex: 0 0 100%; width: 100%; height: 100%; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; }

  /* Reading sheet (card) */
  .wrap {
    max-width: ${width}; margin: 6px auto; min-height: calc(100% - 12px); padding: 30px 34px 40px;
    background: var(--sheet); border: 1px solid var(--sheet-bd); border-radius: 8px;
    box-shadow: var(--sheet-sh);
  }

  .menuhead { text-align: center; margin: 4px 0 24px; }
  .menu-logo { height: 84px; width: 84px; object-fit: contain; filter: invert(var(--logo-invert)); }
  .menu-title { font-size: 1.5rem; font-weight: 700; margin-top: 6px; }

  /* Title band */
  h1.band {
    font-size: 1.95rem; text-align: center; font-weight: 700; line-height: 1.2;
    padding: .55em .9em; margin: 0 0 1.1em; border-radius: 16px;
    background: var(--bbg, #ddd); color: var(--btxt, #333);
  }

  .body { font-size: var(--fs); }
  .body p { margin: 0 0 .7em; }
  .body p:empty::before { content: "\\00a0"; }
  .body ul { list-style: disc; padding-left: 1.4em; }
  .body ol { list-style: decimal; padding-left: 1.4em; }
  .body li { margin: .15em 0; }
  .body hr { border: none; border-top: 2px solid rgba(127,127,127,.4); margin: .9em 0; }
  .body strong { font-weight: 700; } .body em { font-style: italic; }
  a.internal-link { color: var(--link); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }

  /* Navigation cards */
  .grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 8px; }
  @media (min-width: 600px) { .grid { grid-template-columns: 1fr 1fr; } }
  .scard {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    cursor: pointer; text-align: left; width: 100%;
    border: 1px solid var(--card-bd); border-radius: 14px; padding: 16px 18px;
    font-size: 1.15rem; font-weight: 600; color: inherit; background: var(--card);
    transition: border-color .12s, box-shadow .12s, transform .12s;
  }
  .scard:hover { border-color: var(--card-bd-h); box-shadow: var(--card-sh); transform: translateY(-1px); }
  .scard-main { min-width: 0; }
  .scard small { display: block; font-weight: 400; opacity: .7; font-size: .78rem; margin-top: 4px; }
  .scard-arrow { flex-shrink: 0; font-size: 1.5em; line-height: 1; opacity: .38; }
  .group { font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; opacity: .6; margin: 1.8em 0 .3em; }

  /* Barra inferior: flechas (desktop) + botones personalizados del folio */
  .pagenav {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px 16px; padding-bottom: calc(10px + env(safe-area-inset-bottom));
    background: var(--bar); border-top: 1px solid var(--bar-bd);
  }
  .pagenav:empty { display: none; }
  .pagenav svg { pointer-events: none; }
  .pagenav button {
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--btn-bd); background: var(--btn); color: inherit;
    border-radius: 12px; padding: 8px; min-height: 54px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pagenav button:not(:disabled):hover { border-color: var(--btn-bd-strong); }
  .pagenav button:disabled { opacity: .38; }
  .nav-side, .nav-next { flex: 1; max-width: calc(${width} / 2); }
  .nav-next { font-weight: 700; border-color: var(--btn-bd-strong); }
  .pagenav.has-acts { justify-content: space-between; }
  .pagenav.has-acts .nav-side, .pagenav.has-acts .nav-next { flex: 0 0 auto; width: 56px; max-width: 56px; }
  .pageacts { flex: 1; min-width: 0; display: flex; justify-content: center; gap: 8px; }
  .pageacts .linkbtn { flex: 1; min-width: 0; max-width: 240px; padding: 10px 14px; font-size: 1rem; font-weight: 600; }
  /* Táctil (sin mouse): se navega con swipe → sin flechas. */
  @media (hover: none) and (pointer: coarse) {
    .pagenav .nav-side, .pagenav .nav-next { display: none; }
    .pagenav:not(.has-acts) { display: none; }
  }
`;
}

/** Builds the full self-contained navigable guide and returns the HTML string. */
export function renderGuideHtml(project: Project): string {
  const width = project.maxChars && project.maxChars > 0 ? `${project.maxChars}ch` : '46rem';

  const bandCss = project.sections
    .map((s) => {
      const b = bandColors(s.titleBarColor || '#4a4a4a');
      return (
        `.band-${s.id}{--bbg:${b.lightBg};--btxt:${b.lightText};}` +
        `@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .band-${s.id}{--bbg:${b.darkBg};--btxt:${b.darkText};}}` +
        `:root[data-theme="dark"] .band-${s.id}{--bbg:${b.darkBg};--btxt:${b.darkText};}`
      );
    })
    .join('\n');

  const data = {
    name: project.name,
    sections: project.sections.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      folios: s.folios.map((f) => ({
        id: f.id,
        title: f.title,
        body: f.guion || '',
        links: (f.links || []).filter((l) => l.target && l.target.id),
      })),
    })),
  };
  // Escape "<" so nothing (e.g. "</script>" inside body HTML) can break out of the script.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  const html =
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<link rel="icon" href="' + LOGO + '">\n' +
    '<title>' + (project.name || 'Guía') + '</title>\n<style>' + css(width) + '\n' + bandCss + '</style>\n</head>\n<body>\n' +
    '<div class="topbar">' +
      '<img class="brand-logo" id="brandLogo" src="' + LOGO + '" alt="" title="Ajustes">' +
      '<nav class="crumbs" id="crumbs"></nav>' +
      '<div class="settings" id="settings" hidden>' +
        '<div class="set-label">Tema</div>' +
        '<div class="set-row">' +
          '<button data-theme="light">Claro</button>' +
          '<button data-theme="dark">Oscuro</button>' +
          '<button data-theme="auto">Auto</button>' +
        '</div>' +
        '<div class="set-label">Texto</div>' +
        '<div class="set-row set-fs">' +
          '<button data-fs="-" aria-label="Achicar">A−</button>' +
          '<button data-fs="+" aria-label="Agrandar">A+</button>' +
        '</div>' +
      '</div>' +
    '</div>\n' +
    '<div class="stage">' +
      '<aside class="history" id="history"></aside>' +
      '<div class="viewport"><div class="track" id="track"></div></div>' +
      '<div class="hist-backdrop" id="histBackdrop"></div>' +
    '</div>\n' +
    '<div class="pagenav" id="pagenav"></div>\n' +
    '<script>\nvar GUIDE = ' + json + ';\nvar LOGO = ' + JSON.stringify(LOGO) + ';\n' + RUNTIME + '\n</script>\n' +
    '</body>\n</html>';

  return html;
}

/** Vista previa: genera la guía y la abre en una pestaña nueva (efímera, no publica). */
export function openGuide(project: Project) {
  const html = renderGuideHtml(project);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
