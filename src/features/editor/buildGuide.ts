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
var histHandle = document.getElementById('histHandle');
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
  var html = '<h1 class="band band-'+s.id+'">'+esc(f.title||'')+'</h1>';
  html += '<div class="body">'+(f.body||'')+'</div>';
  if(f.links && f.links.length){
    html += '<div class="links">' + f.links.map(function(l){
      return '<button class="linkbtn" data-kind="'+l.target.kind+'" data-id="'+l.target.id+'">'+esc(l.label||'Ir')+'</button>';
    }).join('') + '</div>';
  }
  return html;
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
function renderMenu(){ crumbs.innerHTML = ''; setSingle(menuInner()); pagenav.innerHTML=''; }
function renderSection(id){
  var s = sectionById(id); if(!s) return renderMenu();
  crumbs.innerHTML = crumbHome(false);
  setSingle(sectionInner(s)); pagenav.innerHTML='';
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
  pagenav.innerHTML = ''
    + '<button class="nav-side" aria-label="Anterior" '+(prev?'data-go="#/f/'+prev.id+'"':'disabled')+'>'+chevL+'</button>'
    + '<button class="nav-next" aria-label="Siguiente" '+(next?'data-go="#/f/'+next.id+'"':'disabled')+'>'+chevR+'</button>';
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
if(histHandle) histHandle.addEventListener('click', openHist);
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

/* ---- finger-following swipe carousel ---- */
var sx=0, sy=0, W=0, axis=null, dragging=false, swipable=false, hasPrev=false, hasNext=false, gi0=0, pendingHash=null;
viewport.addEventListener('touchstart', function(e){
  if(e.touches.length!==1){ swipable=false; return; }
  axis=null; dragging=false; pendingHash=null;
  var id=currentFolioId(); swipable=!!id;
  sx=e.touches[0].clientX; sy=e.touches[0].clientY;
  if(swipable){ gi0=flatIndex(id); hasPrev=gi0>0; hasNext=gi0<FLAT.length-1; W=viewport.clientWidth; track.classList.remove('anim'); }
}, {passive:true});
viewport.addEventListener('touchmove', function(e){
  if(!swipable) return;
  var dx=e.touches[0].clientX-sx, dy=e.touches[0].clientY-sy;
  if(axis===null){ if(Math.abs(dx)<8 && Math.abs(dy)<8) return; axis = Math.abs(dx)>Math.abs(dy) ? 'x' : 'y'; }
  if(axis!=='x') return;               // vertical → dejar el scroll normal
  e.preventDefault(); dragging=true;
  var d=dx; if((d>0&&!hasPrev)||(d<0&&!hasNext)) d*=0.28;   // resistencia en los extremos
  track.style.transform = 'translateX('+(-W+d)+'px)';
}, {passive:false});
viewport.addEventListener('touchend', function(e){
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

window.addEventListener('hashchange', render);
render();
`;

function css(width: string): string {
  return `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden;
    background: #ECE3D2; color: #2A2620;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 1.5rem; line-height: 1.55;
  }
  @media (prefers-color-scheme: dark) { body { background: #15161A; color: #E7E5E0; } }

  /* Top bar with breadcrumb */
  .topbar {
    flex-shrink: 0; display: flex; align-items: center; gap: 12px;
    background: #E3D8C4; border-bottom: 1px solid rgba(120,105,80,.22);
    padding: 8px 16px; font-size: 1rem;
  }
  @media (prefers-color-scheme: dark) { .topbar { background: #1E2026; border-bottom-color: rgba(255,255,255,.08); } }
  .topbar .brand-logo { height: 26px; width: 26px; object-fit: contain; cursor: pointer; flex-shrink: 0; }
  @media (prefers-color-scheme: dark) { .topbar .brand-logo { filter: invert(1); } }
  .crumbs { flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; overflow: hidden; white-space: nowrap; }
  .crumb {
    cursor: pointer; border: none; background: transparent; color: inherit;
    font-size: 1rem; font-family: inherit; padding: 4px 8px; border-radius: 8px;
    max-width: 42vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .crumb:not(.cur):hover { background: rgba(120,105,80,.16); }
  @media (prefers-color-scheme: dark) { .crumb:not(.cur):hover { background: rgba(255,255,255,.10); } }
  .crumb.cur { font-weight: 700; cursor: default; flex-shrink: 1; }
  .crumb:not(.cur) { opacity: .82; flex-shrink: 0; }
  .csep { opacity: .4; font-size: 1rem; flex-shrink: 0; }

  /* Stage: panel de historial + viewport */
  .stage { position: relative; flex: 1; display: flex; min-height: 0; }

  .history {
    position: absolute; z-index: 20; top: 0; bottom: 0; left: 0;
    width: 80%; max-width: 320px;
    background: #E3D8C4; border-right: 1px solid rgba(120,105,80,.24);
    overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 8px;
    transform: translateX(-100%); transition: transform .24s ease;
  }
  .history.open { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,.28); }
  @media (prefers-color-scheme: dark) { .history { background: #1E2026; border-right-color: rgba(255,255,255,.08); } }

  .hist-backdrop { position: absolute; inset: 0; z-index: 15; background: rgba(0,0,0,.35); opacity: 0; pointer-events: none; transition: opacity .24s; }
  .hist-backdrop.open { opacity: 1; pointer-events: auto; }

  .hist-handle {
    position: absolute; z-index: 10; left: 0; top: 0; bottom: 0; width: 30px;
    border: none; border-right: 1px solid rgba(120,105,80,.28);
    background: #E3D8C4; color: inherit; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .hist-handle::after {
    content: "\\203a"; font-size: 1.3rem; font-weight: 700; opacity: .7;
    background: rgba(120,105,80,.16); border-radius: 999px; width: 22px; height: 44px;
    display: flex; align-items: center; justify-content: center;
  }
  @media (prefers-color-scheme: dark) {
    .hist-handle { background: #1E2026; border-right-color: rgba(255,255,255,.10); }
    .hist-handle::after { background: rgba(255,255,255,.10); }
  }

  .hist-title { font-size: .82rem; text-transform: uppercase; letter-spacing: .5px; opacity: .55; padding: 8px 10px 4px; }
  .hist-item {
    display: block; width: 100%; text-align: left; cursor: pointer;
    border: none; background: transparent; color: inherit; font-family: inherit;
    font-size: 1rem; padding: 10px; border-radius: 8px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .hist-item:hover { background: rgba(120,105,80,.14); }
  @media (prefers-color-scheme: dark) { .hist-item:hover { background: rgba(255,255,255,.08); } }
  .hist-item.cur { font-weight: 700; }

  /* Escritorio: panel fijo, sin handle/backdrop */
  @media (min-width: 900px) {
    .history { position: static; transform: none; width: 260px; max-width: 260px; box-shadow: none; flex-shrink: 0; }
    .hist-handle, .hist-backdrop { display: none; }
  }

  /* Carousel viewport + track (prev | current | next) */
  .viewport { flex: 1; overflow: hidden; position: relative; }
  .track { display: flex; height: 100%; will-change: transform; }
  .track.anim { transition: transform .28s cubic-bezier(.22,.61,.36,1); }
  .page { flex: 0 0 100%; width: 100%; height: 100%; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; }

  /* Reading sheet (card) — llena el alto, con unos px de aire arriba/abajo */
  .wrap {
    max-width: ${width}; margin: 6px auto; min-height: calc(100% - 12px); padding: 30px 34px 40px;
    background: #FBF7EE; border: 1px solid rgba(120,105,80,.16); border-radius: 8px;
    box-shadow: 0 1px 2px rgba(70,55,30,.05), 0 10px 30px rgba(70,55,30,.07);
  }
  @media (prefers-color-scheme: dark) {
    .wrap { background: #23262C; border-color: rgba(255,255,255,.06); box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.28); }
  }

  .menuhead { text-align: center; margin: 4px 0 24px; }
  .menu-logo { height: 84px; width: 84px; object-fit: contain; }
  @media (prefers-color-scheme: dark) { .menu-logo { filter: invert(1); } }
  .menu-title { font-size: 1.5rem; font-weight: 700; margin-top: 6px; }

  /* Title band — full width, rounded, sober */
  h1.band {
    font-size: 1.95rem; text-align: center; font-weight: 700; line-height: 1.2;
    padding: .55em .9em; margin: 0 0 1.1em; border-radius: 16px;
  }

  .body p { margin: 0 0 .7em; }
  .body p:empty::before { content: "\\00a0"; }
  .body ul { list-style: disc; padding-left: 1.4em; }
  .body ol { list-style: decimal; padding-left: 1.4em; }
  .body li { margin: .15em 0; }
  .body hr { border: none; border-top: 2px solid rgba(127,127,127,.4); margin: .9em 0; }
  .body strong { font-weight: 700; } .body em { font-style: italic; }
  a.internal-link { color: #4A6B57; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
  @media (prefers-color-scheme: dark) { a.internal-link { color: #89A995; } }

  /* Navigation cards */
  .grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 8px; }
  @media (min-width: 600px) { .grid { grid-template-columns: 1fr 1fr; } }
  .scard {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    cursor: pointer; text-align: left; width: 100%;
    border: 1px solid rgba(120,105,80,.20); border-radius: 14px; padding: 16px 18px;
    font-size: 1.15rem; font-weight: 600; color: inherit; background: #FEFCF7;
    transition: border-color .12s, box-shadow .12s, transform .12s;
  }
  @media (prefers-color-scheme: dark) { .scard { background: #2A2D34; border-color: rgba(255,255,255,.08); } }
  .scard:hover { border-color: rgba(120,105,80,.42); box-shadow: 0 4px 14px rgba(70,55,30,.10); transform: translateY(-1px); }
  @media (prefers-color-scheme: dark) { .scard:hover { border-color: rgba(255,255,255,.20); box-shadow: 0 4px 14px rgba(0,0,0,.35); } }
  .scard-main { min-width: 0; }
  .scard small { display: block; font-weight: 400; opacity: .7; font-size: .78rem; margin-top: 4px; }
  .scard-arrow { flex-shrink: 0; font-size: 1.5em; line-height: 1; opacity: .38; }
  .group { font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; opacity: .6; margin: 1.8em 0 .3em; }

  .links { display: flex; flex-wrap: wrap; gap: 10px; margin: 1.4em 0 .2em; }
  .linkbtn { cursor: pointer; border: 1px solid rgba(120,105,80,.35); background: transparent; color: inherit; border-radius: 10px; padding: 10px 16px; font-size: 1.05rem; }
  @media (prefers-color-scheme: dark) { .linkbtn { border-color: rgba(255,255,255,.22); } }

  /* Bottom navigation */
  .pagenav {
    flex-shrink: 0; display: flex; justify-content: center; gap: 8px; padding: 10px 16px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    background: #E3D8C4; border-top: 1px solid rgba(120,105,80,.24);
  }
  @media (prefers-color-scheme: dark) { .pagenav { background: #1E2026; border-top-color: rgba(255,255,255,.08); } }
  .pagenav:empty { display: none; }
  .pagenav button {
    flex: 1; max-width: calc(${width} / 2); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(120,105,80,.28); background: #FBF7EE; color: inherit;
    border-radius: 12px; padding: 8px; min-height: 54px;
  }
  .pagenav svg { pointer-events: none; }
  @media (prefers-color-scheme: dark) { .pagenav button { background: #2A2D34; border-color: rgba(255,255,255,.10); } }
  .pagenav button.nav-next { font-weight: 700; border-color: rgba(120,105,80,.5); }
  @media (prefers-color-scheme: dark) { .pagenav button.nav-next { border-color: rgba(255,255,255,.24); } }
  .pagenav button:not(:disabled):hover { border-color: rgba(120,105,80,.55); }
  .pagenav button:disabled { opacity: .38; }
  /* En pantallas chicas: barra inferior más compacta y a todo el ancho */
  @media (max-width: 560px) {
    .pagenav { gap: 8px; padding-left: 10px; padding-right: 10px; }
    .pagenav button { padding: 8px; font-size: 1.5rem; min-height: 52px; max-width: none; }
  }
  /* Dispositivos táctiles (sin mouse): se navega con swipe, sobran las flechas */
  @media (hover: none) and (pointer: coarse) {
    .pagenav { display: none; }
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
        `.band-${s.id}{background:${b.lightBg};color:${b.lightText};}` +
        `@media(prefers-color-scheme:dark){.band-${s.id}{background:${b.darkBg};color:${b.darkText};}}`
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
    '<div class="topbar"><img class="brand-logo" src="' + LOGO + '" data-go="#/" alt=""><nav class="crumbs" id="crumbs"></nav></div>\n' +
    '<div class="stage">' +
      '<aside class="history" id="history"></aside>' +
      '<div class="viewport"><div class="track" id="track"></div></div>' +
      '<div class="hist-backdrop" id="histBackdrop"></div>' +
      '<button class="hist-handle" id="histHandle" aria-label="Historial"></button>' +
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
