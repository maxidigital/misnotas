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
var histWrap = document.getElementById('histWrap');
var togIndex = document.getElementById('togIndex');
var togSession = document.getElementById('togSession');
var favWrap = document.getElementById('favWrap');
var favPanel = document.getElementById('favpanel');
var favTog = document.getElementById('favTog');
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

/* ---- historial (persistido por guía en localStorage) ---- */
var HIST = [];
function histKey(){ return 'reader.hist:' + location.pathname; }
function saveHist(){ try{ localStorage.setItem(histKey(), JSON.stringify(HIST)); }catch(e){} }
try{ var _hs=JSON.parse(localStorage.getItem(histKey())||'[]'); if(_hs && _hs.length) HIST=_hs.filter(function(x){ return typeof x==='string'; }); }catch(e){}
function pageLabel(hash){
  var parts=(hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(parts[0]==='f' && parts[1]){ var r=findFolio(parts[1]); return r ? (r.folio.title||'(sin t\\u00edtulo)') : 'Folio'; }
  if(parts[0]==='s' && parts[1]){ var s=sectionById(parts[1]); return s ? s.name : 'Secci\\u00f3n'; }
  return '\\u2302 Inicio';
}
function hashResolves(hash){
  var p=(hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(p[0]==='f' && p[1]) return !!findFolio(p[1]);
  if(p[0]==='s' && p[1]) return !!sectionById(p[1]);
  return false;
}
function pushHist(hash){
  hash = hash || '#/';
  if(hash.indexOf('#/f/')!==0) return;   // solo folios en la sesión (ni Inicio ni secciones)
  HIST = HIST.filter(function(h){ return h!==hash; });
  HIST.unshift(hash);
  if(HIST.length>50) HIST.length=50;
  saveHist();
}
function clearHist(){ HIST=[]; saveHist(); renderHistory(); }
function renderHistory(){
  if(!histPanel) return;
  var cur = location.hash || '#/';
  var items = HIST.filter(function(h){ return h.indexOf('#/f/')===0 && hashResolves(h); });
  var html = '<div class="hist-title">Sesi\\u00f3n</div>';
  html += '<div class="hist-list">' + items.map(function(h){
    return '<button class="hist-item'+(h===cur?' cur':'')+'" data-go="'+h+'">'+esc(pageLabel(h))+'</button>';
  }).join('') + '</div>';
  html += '<button class="hist-clear">Limpiar</button>';
  histPanel.innerHTML = html;
}
/* ---- panel lateral: dos vistas (Índice / Sesión) ---- */
var panelView = 'session';
var treeOpen = {};
function renderTree(){
  if(!histPanel) return;
  var cur = currentFolioId();
  function row(s){
    var open = !!treeOpen[s.id];
    var h = '<button class="tree-sec" data-sec="'+s.id+'">'
      + '<span class="tree-chevron">'+(open?'\\u25be':'\\u25b8')+'</span>'
      + '<span class="tree-dot band-'+s.id+'"></span>'
      + '<span class="tree-name">'+esc(s.name)+'</span>'
      + '<span class="tree-count">'+s.folios.length+'</span></button>';
    if(open){
      h += s.folios.map(function(f){
        return '<button class="tree-folio'+(cur===f.id?' cur':'')+'" data-go="#/f/'+f.id+'">'+esc(f.title||'(sin t\\u00edtulo)')+'</button>';
      }).join('');
    }
    return h;
  }
  var main = GUIDE.sections.filter(function(s){ return s.type!=='apendice'; });
  var apx = GUIDE.sections.filter(function(s){ return s.type==='apendice'; });
  var html = '<div class="hist-title">\\u00cdndice</div><div class="hist-list">';
  html += main.map(row).join('');
  if(apx.length){ html += '<div class="tree-group">Ap\\u00e9ndices</div>' + apx.map(row).join(''); }
  html += '</div>';
  histPanel.innerHTML = html;
}
function renderPanel(){ if(panelView==='index') renderTree(); else renderHistory(); }
/* ---- favoritos (persistidos por guía) ---- */
var FAV = [];
function favKey(){ return 'reader.fav:' + location.pathname; }
try{ var _fv=JSON.parse(localStorage.getItem(favKey())||'[]'); if(_fv && _fv.length) FAV=_fv.filter(function(x){ return typeof x==='string'; }); }catch(e){}
function saveFav(){ try{ localStorage.setItem(favKey(), JSON.stringify(FAV)); }catch(e){} }
function isFav(id){ return !!id && FAV.indexOf(id)!==-1; }
function toggleFav(id){ if(!id) return; if(isFav(id)){ FAV=FAV.filter(function(x){ return x!==id; }); } else { FAV.unshift(id); } saveFav(); updateFavUI(); }
function renderFav(){
  if(!favPanel) return;
  var cur = currentFolioId();
  var items = FAV.filter(function(id){ return !!findFolio(id); });
  var html = '<div class="hist-title">Favoritos</div>';
  if(items.length){
    html += '<div class="hist-list">' + items.map(function(id){
      var r = findFolio(id);
      return '<button class="hist-item'+(id===cur?' cur':'')+'" data-go="#/f/'+id+'">'+esc(r.folio.title||'(sin t\\u00edtulo)')+'</button>';
    }).join('') + '</div>';
  } else {
    html += '<div class="fav-empty">Toc\\u00e1 la estrella \\u2605 arriba de un folio para guardarlo ac\\u00e1.</div>';
  }
  favPanel.innerHTML = html;
}
function updateStar(){
  var cur = currentFolioId(); if(!cur || !track) return;
  var pages = track.querySelectorAll('.page');
  var page = pages.length>1 ? pages[1] : pages[0];
  var wrap = page ? page.querySelector('.wrap') : null; if(!wrap) return;
  var ex = wrap.querySelector('.favstar');
  if(isFav(cur)){
    if(!ex){ var b=document.createElement('button'); b.className='favstar'; b.setAttribute('data-favtoggle', cur); b.setAttribute('aria-label','Quitar de favoritos'); b.title='Quitar de favoritos'; b.textContent='\\u2605'; wrap.appendChild(b); }
  } else if(ex){ ex.remove(); }
}
function updateFavBtn(){
  var b = document.getElementById('favBtn'); if(!b) return;
  var cur = currentFolioId();
  if(!cur){ b.hidden=true; return; }
  b.hidden=false;
  b.textContent = isFav(cur) ? '\\u2605 Quitar de favoritos' : '\\u2606 Marcar como favorito';
  b.classList.toggle('on', isFav(cur));
}
function updateFavUI(){ updateStar(); updateFavBtn(); renderFav(); }
function openFav(){ if(histWrap) histWrap.classList.remove('open'); if(favWrap) favWrap.classList.add('open'); if(histBackdrop) histBackdrop.classList.add('open'); renderFav(); }
function closeFav(){ if(favWrap) favWrap.classList.remove('open'); if(histBackdrop && !(histWrap && histWrap.classList.contains('open'))) histBackdrop.classList.remove('open'); }
function openPanel(view){
  if(favWrap) favWrap.classList.remove('open');
  panelView = view;
  if(view==='index'){ var cur=currentFolioId(); if(cur){ var r=findFolio(cur); if(r) treeOpen[r.section.id]=true; } }
  if(histWrap){ histWrap.classList.remove('view-index','view-session'); histWrap.classList.add('view-'+view); }
  renderPanel();
  if(histWrap) histWrap.classList.add('open');
  if(histBackdrop) histBackdrop.classList.add('open');
}
function closePanel(){ if(histWrap) histWrap.classList.remove('open'); if(histBackdrop) histBackdrop.classList.remove('open'); }
function isTouch(){ return window.matchMedia('(hover: none) and (pointer: coarse)').matches; }

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
  var star = isFav(f.id) ? '<button class="favstar" data-favtoggle="'+f.id+'" aria-label="Quitar de favoritos" title="Quitar de favoritos">\\u2605</button>' : '';
  return star + '<h1 class="band band-'+s.id+'">'+esc(f.title||'')+'</h1>'
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
function renderMenu(){ crumbs.innerHTML = '<span class="brand-name">Instituto Blasco</span>'; setSingle(menuInner()); pagenav.className='pagenav'; pagenav.innerHTML=''; }
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
  var chevL = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  var chevR = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
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
  renderPanel();
  renderFav(); updateFavBtn();
  var parts = (location.hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(parts[0]==='f' && parts[1]) return renderFolio(parts[1]);
  if(parts[0]==='s' && parts[1]) return renderSection(parts[1]);
  return renderMenu();
}

/* ---- click navigation ---- */
if(histBackdrop) histBackdrop.addEventListener('click', function(){ closePanel(); closeFav(); });
if(favTog) favTog.addEventListener('click', function(e){ e.stopPropagation(); if(favWrap && favWrap.classList.contains('open')) closeFav(); else openFav(); });
function togHandler(view){ return function(e){
  e.stopPropagation();
  if(histWrap && histWrap.classList.contains('open') && panelView===view) closePanel();
  else openPanel(view);
}; }
if(togIndex) togIndex.addEventListener('click', togHandler('index'));
if(togSession) togSession.addEventListener('click', togHandler('session'));
if(histPanel) histPanel.addEventListener('click', function(e){
  var sec=e.target.closest('.tree-sec');
  if(sec){ e.stopPropagation(); var sid=sec.getAttribute('data-sec'); treeOpen[sid]=!treeOpen[sid]; renderTree(); return; }
  if(e.target.closest('.hist-clear')){ e.stopPropagation(); clearHist(); }
});
document.addEventListener('click', function(e){
  var fv = e.target.closest('[data-favtoggle]');
  if(fv){ e.preventDefault(); e.stopPropagation(); toggleFav(fv.getAttribute('data-favtoggle')); return; }
  var g = e.target.closest('[data-go]');
  if(g){ location.hash = g.getAttribute('data-go'); if(isTouch()){ closePanel(); closeFav(); } return; }
  var a = e.target.closest('a.internal-link, [data-kind][data-id]');
  if(a){
    e.preventDefault();
    var k = a.getAttribute('data-kind'), id = a.getAttribute('data-id');
    if(id){ location.hash = (k==='section'?'#/s/':'#/f/') + id; if(isTouch()){ closePanel(); closeFav(); } }
  }
});
document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){ closePanel(); closeFav(); }
  if(!currentFolioId()) return;
  if(e.key==='ArrowLeft') goRel(-1);
  if(e.key==='ArrowRight') goRel(1);
});

/* ---- finger-following swipe carousel + tap "kindle" a la izquierda para el historial ---- */
var sx=0, sy=0, W=0, axis=null, dragging=false, swipable=false, hasPrev=false, hasNext=false, gi0=0, pendingHash=null;
var startLeft=false, startRight=false, startTop=false, moved=false;
function drawerMode(){ return window.matchMedia('(max-width: 899px)').matches; }
viewport.addEventListener('touchstart', function(e){
  if(e.touches.length!==1){ swipable=false; return; }
  axis=null; dragging=false; pendingHash=null; moved=false;
  var id=currentFolioId(); swipable=!!id;
  sx=e.touches[0].clientX; sy=e.touches[0].clientY;
  var vr=viewport.getBoundingClientRect();
  startLeft=(sx-vr.left) < Math.max(56, vr.width*0.18);
  startRight=(sx-vr.left) > vr.width - Math.max(56, vr.width*0.18);
  startTop=(sy-vr.top) < vr.height/2;
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
  // tap (sin arrastrar) en la banda izquierda → arriba: Índice, abajo: Sesión
  if(!moved && startLeft && !(histWrap && histWrap.classList.contains('open'))
     && !e.target.closest('a, button')){
    openPanel(startTop ? 'index' : 'session'); dragging=false; return;
  }
  // tap en la banda derecha → Favoritos
  if(!moved && startRight && !(favWrap && favWrap.classList.contains('open'))
     && !e.target.closest('a, button')){
    openFav(); dragging=false; return;
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
var FZ = 1;
function currentTheme(){ return root.getAttribute('data-theme') || 'auto'; }
function currentMode(){ return root.getAttribute('data-mode')||'guiada'; }
function syncSettings(){
  if(!settings) return;
  var t=currentTheme(), bs=settings.querySelectorAll('[data-theme]');
  for(var i=0;i<bs.length;i++){ bs[i].classList.toggle('active', bs[i].getAttribute('data-theme')===t); }
  var m=currentMode(), ms=settings.querySelectorAll('[data-mode]');
  for(var j=0;j<ms.length;j++){ ms[j].classList.toggle('active', ms[j].getAttribute('data-mode')===m); }
}
function applyMode(m){
  if(m!=='limpia') m='guiada';
  root.setAttribute('data-mode', m);
  try{ localStorage.setItem('reader.mode', m); }catch(e){}
  syncSettings();
}
function applyTheme(t){
  if(t==='light'||t==='dark'){ root.setAttribute('data-theme', t); } else { root.removeAttribute('data-theme'); t='auto'; }
  try{ localStorage.setItem('reader.theme', t); }catch(e){}
  syncSettings();
}
function applyFZ(v){
  FZ = Math.max(0.8, Math.min(2.2, Math.round(v*10)/10));
  root.style.setProperty('--fz', String(FZ));
  try{ localStorage.setItem('reader.fz', String(FZ)); }catch(e){}
}
try{ var _t=localStorage.getItem('reader.theme'); if(_t==='light'||_t==='dark') root.setAttribute('data-theme', _t); }catch(e){}
try{ var _f=parseFloat(localStorage.getItem('reader.fz')); if(_f) applyFZ(_f); }catch(e){}
try{ var _m=localStorage.getItem('reader.mode'); root.setAttribute('data-mode', _m==='limpia'?'limpia':'guiada'); }catch(e){ root.setAttribute('data-mode','guiada'); }
syncSettings();
if(brandLogo) brandLogo.addEventListener('click', function(e){ e.stopPropagation(); if(settings){ settings.hidden=!settings.hidden; syncSettings(); updateFavBtn(); } });
if(settings) settings.addEventListener('click', function(e){
  e.stopPropagation();
  var fb=e.target.closest('#favBtn'); if(fb){ toggleFav(currentFolioId()); return; }
  var t=e.target.closest('[data-theme]'); if(t && settings.contains(t)){ applyTheme(t.getAttribute('data-theme')); return; }
  var f=e.target.closest('[data-fs]'); if(f && settings.contains(f)){ applyFZ(FZ + (f.getAttribute('data-fs')==='+'?0.1:-0.1)); return; }
  var md=e.target.closest('[data-mode]'); if(md && settings.contains(md)){ applyMode(md.getAttribute('data-mode')); return; }
});
/* listeners directos, a prueba de balas, para A- / A+ */
var fzMinus=document.getElementById('fzMinus'), fzPlus=document.getElementById('fzPlus');
if(fzMinus) fzMinus.addEventListener('click', function(e){ e.stopPropagation(); applyFZ(FZ-0.1); });
if(fzPlus) fzPlus.addEventListener('click', function(e){ e.stopPropagation(); applyFZ(FZ+0.1); });
document.addEventListener('click', function(e){
  if(settings && !settings.hidden && e.target!==brandLogo && !settings.contains(e.target)) settings.hidden=true;
});

/* ---- PWA: manifest dinámico (conoce la URL final), service worker e instalar ---- */
try {
  var _mani = {
    name: GUIDE.name || 'Gu\\u00eda',
    short_name: (GUIDE.name || 'Gu\\u00eda').slice(0, 20),
    start_url: location.pathname,
    scope: location.pathname,
    display: 'standalone',
    background_color: '#ECE3D2',
    theme_color: '#E3D8C4',
    icons: [
      { src: LOGO, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: LOGO, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  var _ml = document.createElement('link');
  _ml.rel = 'manifest';
  _ml.href = URL.createObjectURL(new Blob([JSON.stringify(_mani)], { type: 'application/manifest+json' }));
  document.head.appendChild(_ml);
} catch(e){}
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/p/sw.js').catch(function(){}); }
var refreshBtn=document.getElementById('refreshBtn');
if(refreshBtn) refreshBtn.addEventListener('click', function(e){ e.stopPropagation(); location.reload(); });
var deferredPrompt=null, installBtn=document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredPrompt=e; if(installBtn) installBtn.hidden=false; });
if(installBtn) installBtn.addEventListener('click', function(e){
  e.stopPropagation();
  if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; installBtn.hidden=true; }
});
window.addEventListener('appinstalled', function(){ if(installBtn) installBtn.hidden=true; });

/* ---- aviso de versión nueva (si se publicó algo mientras la guía estaba abierta) ---- */
var updbar=document.getElementById('updbar'), updbtn=document.getElementById('updbtn');
if(updbtn) updbtn.addEventListener('click', function(){ location.reload(); });
function checkUpdate(){
  try{
    fetch(location.pathname, { cache:'no-store' }).then(function(r){ return r.ok ? r.text() : ''; }).then(function(t){
      var m = t.match(/GUIDE_VER\\s*=\\s*"([^"]+)"/);
      if(m && m[1] && m[1] !== GUIDE_VER && updbar) updbar.hidden=false;
    }).catch(function(){});
  }catch(e){}
}
setTimeout(checkUpdate, 4000);
document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible') checkUpdate(); });

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
    --link:#4A6B57; --logo-invert:0; --fz:1; --histw:min(80vw, 300px); --selected:#4692F2;
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
    cursor: pointer; border: none; background: transparent; color: var(--selected);
    font-size: 1rem; font-family: inherit; padding: 4px 8px; border-radius: 8px;
    min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0;
  }
  .crumb:not(.cur):hover { background: var(--hover); }
  .crumb.cur { font-weight: 700; cursor: default; }
  .crumb:last-child { flex-shrink: 1; }
  .csep { opacity: .4; font-size: 1rem; flex-shrink: 0; }
  .brand-name { font-weight: 600; font-size: 1rem; }

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
  .settings button.active { border-color: var(--selected); box-shadow: inset 0 0 0 1px var(--selected); font-weight: 700; }
  .settings .set-install, .settings .set-refresh, .settings .set-fav { flex: 0 0 auto; margin-top: 2px; }
  .settings .set-fav.on { border-color: #F5B301; color: #C98A00; font-weight: 700; }
  .set-install[hidden] { display: none; }
  .set-fav[hidden] { display: none; }
  /* Aviso de versión nueva */
  .updbar {
    position: fixed; left: 50%; transform: translateX(-50%);
    bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 60;
    display: flex; align-items: center; gap: 10px;
    background: var(--bar); border: 1px solid var(--bar-bd); color: inherit;
    border-radius: 999px; padding: 8px 8px 8px 16px; box-shadow: 0 6px 20px rgba(0,0,0,.28);
    font-size: .95rem;
  }
  .updbar[hidden] { display: none; }
  .updbar button {
    cursor: pointer; border: none; background: var(--selected); color: #fff;
    border-radius: 999px; padding: 8px 14px; font-family: inherit; font-size: .9rem; font-weight: 600;
  }
  .set-row.set-fs button { flex: 0 0 auto; width: 46px; font-size: 1.05rem; }

  /* Stage: panel de historial + viewport */
  .stage { position: relative; flex: 1; display: flex; min-height: 0; }
  .histwrap {
    position: absolute; z-index: 20; top: 0; bottom: 0; left: 0;
    display: flex; align-items: stretch;
    transform: translateX(calc(-1 * var(--histw)));
    transition: transform .24s ease;
  }
  .histwrap.open { transform: translateX(0); }
  .history {
    width: var(--histw);
    background: var(--bar); border-right: 1px solid var(--bar-bd);
    overflow: hidden; display: flex; flex-direction: column; padding: 8px;
  }
  .histwrap.open .history { box-shadow: 0 0 40px rgba(0,0,0,.28); }
  /* Panel de Favoritos (a la derecha, espejo del historial/índice) */
  .favwrap {
    position: absolute; z-index: 20; top: 0; bottom: 0; right: 0;
    display: flex; align-items: stretch;
    transform: translateX(var(--histw));
    transition: transform .24s ease;
  }
  .favwrap.open { transform: translateX(0); }
  .favpanel {
    width: var(--histw);
    background: var(--bar); border-left: 1px solid var(--bar-bd);
    overflow: hidden; display: flex; flex-direction: column; padding: 8px;
  }
  .favwrap.open .favpanel { box-shadow: 0 0 40px rgba(0,0,0,.28); }
  .fav-toggles { box-shadow: -2px 0 8px rgba(0,0,0,.12); }
  .tog.fav-tog { border: 1px solid var(--bar-bd); border-right: none; border-radius: 10px 0 0 10px; }
  .favwrap.open .fav-tog svg { transform: rotate(180deg); }
  .fav-empty { padding: 14px 12px; opacity: .6; font-size: .95rem; line-height: 1.45; }
  /* Dos flechitas apiladas: arriba = Índice, abajo = Sesión */
  .toggles { align-self: stretch; flex-shrink: 0; width: 24px; display: none; flex-direction: column; box-shadow: 2px 0 8px rgba(0,0,0,.12); }
  /* Pestañas: visibles en desktop y en modo Guiada; escondidas en Limpia (táctil) */
  @media (hover: hover) and (pointer: fine) { .toggles { display: flex; } }
  :root[data-mode="guiada"] .toggles { display: flex; }
  .tog {
    flex: 1; cursor: pointer; padding: 0;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--bar-bd); border-left: none;
    background: var(--bar); color: inherit;
  }
  .tog:first-child { border-radius: 0 10px 0 0; }
  .tog:last-child { border-radius: 0 0 10px 0; border-top: none; }
  .tog svg { pointer-events: none; opacity: .7; transition: transform .24s ease; }
  .tog-label { display: none; font-size: .72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .histwrap.open.view-index .tog-index svg { transform: rotate(180deg); }
  .histwrap.open.view-session .tog-session svg { transform: rotate(180deg); }
  .hist-backdrop { display: none; position: absolute; inset: 0; z-index: 15; background: rgba(0,0,0,.35); opacity: 0; pointer-events: none; transition: opacity .24s; }
  .hist-backdrop.open { opacity: 1; pointer-events: auto; }
  /* Táctil (mobile/tablet): sin flechitas, se usa el tap kindle (arriba Índice / abajo Sesión);
     el backdrop cierra al tocar afuera. Desktop: flechitas y el panel queda abierto hasta cerrarlo. */
  @media (hover: none) and (pointer: coarse) {
    .hist-backdrop { display: block; }
    /* Guiada: pestañas verticales, sin flechita; el contenido se corre para no taparlo */
    :root[data-mode="guiada"] .tog svg { display: none; }
    :root[data-mode="guiada"] .tog-label { display: block; writing-mode: vertical-rl; letter-spacing: .5px; opacity: .85; padding: 6px 0; }
    :root[data-mode="guiada"] .toggles { width: 26px; }
    :root[data-mode="guiada"] .viewport { margin-left: 26px; margin-right: 26px; }
  }
  /* El selector de Vista solo tiene sentido en táctil */
  @media (hover: hover) and (pointer: fine) { .set-vista { display: none; } }
  /* Índice (árbol) */
  .tree-sec {
    display: flex; align-items: center; gap: 6px; width: 100%; cursor: pointer;
    border: none; background: transparent; color: inherit; font-family: inherit;
    font-size: 1rem; text-align: left; padding: 8px; border-radius: 8px;
  }
  .tree-sec:hover { background: var(--hover); }
  .tree-chevron { flex-shrink: 0; width: 1em; opacity: .6; font-size: .8em; }
  .tree-dot { flex-shrink: 0; width: 10px; height: 10px; border-radius: 999px; background: var(--bbg, var(--hover)); }
  .tree-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tree-count { flex-shrink: 0; opacity: .5; font-size: .8rem; }
  .tree-folio {
    display: block; width: 100%; cursor: pointer;
    border: none; background: transparent; color: inherit; font-family: inherit;
    font-size: .95rem; text-align: left; padding: 6px 8px 6px 30px; border-radius: 8px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .tree-folio:hover { background: var(--hover); }
  .tree-folio.cur { font-weight: 700; background: var(--hover); box-shadow: inset 3px 0 0 var(--selected); }
  .tree-group { font-size: .72rem; text-transform: uppercase; letter-spacing: .5px; opacity: .55; padding: 12px 10px 4px; margin-top: 6px; border-top: 1px solid var(--bar-bd); }
  .hist-title { flex-shrink: 0; font-size: .82rem; text-transform: uppercase; letter-spacing: .5px; opacity: .55; padding: 8px 10px 4px; }
  .hist-list { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .hist-item {
    display: block; width: 100%; text-align: left; cursor: pointer;
    border: none; background: transparent; color: inherit; font-family: inherit;
    font-size: 1rem; padding: 10px; border-radius: 8px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .hist-item:hover { background: var(--hover); }
  .hist-item.cur { font-weight: 700; box-shadow: inset 3px 0 0 var(--selected); }
  .hist-clear {
    flex-shrink: 0; margin-top: 6px; cursor: pointer;
    border: 1px solid var(--btn-bd); background: var(--btn); color: inherit;
    border-radius: 8px; padding: 10px; font-family: inherit; font-size: .95rem;
  }
  .hist-clear:hover { border-color: var(--btn-bd-strong); }

  /* Carousel viewport + track (prev | current | next) */
  .viewport { flex: 1; overflow: hidden; position: relative; }
  .track { display: flex; height: 100%; will-change: transform; }
  .track.anim { transition: transform .28s cubic-bezier(.22,.61,.36,1); }
  .page { flex: 0 0 100%; width: 100%; height: 100%; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; }

  /* Reading sheet (card) */
  .wrap {
    position: relative;
    max-width: ${width}; margin: 6px auto; min-height: calc(100% - 12px); padding: 30px 34px 40px;
    background: var(--sheet); border: 1px solid var(--sheet-bd); border-radius: 8px;
    box-shadow: var(--sheet-sh);
  }
  .favstar {
    position: absolute; top: 6px; right: 8px; z-index: 3;
    border: none; background: transparent; cursor: pointer;
    color: #F5B301; font-size: 20px; line-height: 1; padding: 4px;
    filter: drop-shadow(0 1px 1px rgba(0,0,0,.28));
  }
  .favstar:hover { transform: scale(1.12); }

  .menuhead { text-align: center; margin: 4px 0 24px; }
  .menu-logo { height: 84px; width: 84px; object-fit: contain; filter: invert(var(--logo-invert)); }
  .menu-title { font-size: calc(1.5rem * var(--fz, 1)); font-weight: 700; margin-top: 6px; }

  /* Title band */
  h1.band {
    font-size: calc(1.95rem * var(--fz, 1)); text-align: center; font-weight: 700; line-height: 1.2;
    padding: .55em .9em; margin: 0 0 1.1em; border-radius: 16px;
    background: var(--bbg, #ddd); color: var(--btxt, #333);
  }

  .body { font-size: calc(1.5rem * var(--fz, 1)); }
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
    font-size: calc(1.15rem * var(--fz, 1)); font-weight: 600; color: inherit; background: var(--card);
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
    padding: 6px 16px; padding-bottom: calc(6px + env(safe-area-inset-bottom));
    background: var(--bar); border-top: 1px solid var(--bar-bd);
  }
  .pagenav:empty { display: none; }
  .pagenav svg { pointer-events: none; }
  .pagenav button {
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--btn-bd); background: var(--btn); color: inherit;
    border-radius: 10px; padding: 5px; min-height: 40px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pagenav button:not(:disabled):hover { border-color: var(--btn-bd-strong); }
  .pagenav button:disabled { opacity: .38; }
  .nav-side, .nav-next { flex: 1; max-width: calc(${width} / 2); }
  .nav-next { font-weight: 700; border-color: var(--btn-bd-strong); }
  /* Con botones personalizados: flechas compactas pegadas al grupo, todo centrado */
  .pagenav.has-acts .nav-side, .pagenav.has-acts .nav-next { flex: 0 0 auto; width: 46px; max-width: 46px; }
  .pageacts { min-width: 0; display: flex; justify-content: center; gap: 8px; }
  .pageacts .linkbtn { flex: 0 1 auto; min-width: 110px; max-width: 240px; padding: 7px 16px; font-size: .95rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Táctil (sin mouse): se navega con swipe → sin flechas; los botones ocupan el ancho */
  @media (hover: none) and (pointer: coarse) {
    /* Limpia: sin flechas (solo swipe). Guiada: se muestran, como en desktop. */
    :root:not([data-mode="guiada"]) .pagenav .nav-side, :root:not([data-mode="guiada"]) .pagenav .nav-next { display: none; }
    :root:not([data-mode="guiada"]) .pagenav:not(.has-acts) { display: none; }
    .pageacts { flex: 1; }
    .pageacts .linkbtn { flex: 1 1 0; min-width: 0; }
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
        `:root[data-theme="dark"] .band-${s.id}{--bbg:${b.darkBg};--btxt:${b.darkText};}` +
        // Si la sección tiene color propio, el botón del menú toma ese color.
        (b.colored ? `.scard.band-${s.id}{background:var(--bbg);color:var(--btxt);border-color:transparent;}` : '')
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
  // Versión del contenido, para avisar si hay una publicación más nueva.
  let vh = 5381;
  for (let i = 0; i < json.length; i++) vh = ((vh << 5) + vh + json.charCodeAt(i)) >>> 0;
  const guideVer = vh.toString(36);

  const nameEsc = (project.name || 'Guía').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html =
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<link rel="icon" href="' + LOGO + '">\n' +
    '<meta name="theme-color" content="#E3D8C4">\n' +
    '<meta name="mobile-web-app-capable" content="yes">\n' +
    '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n' +
    '<meta name="apple-mobile-web-app-title" content="' + nameEsc + '">\n' +
    '<link rel="apple-touch-icon" href="' + LOGO + '">\n' +
    '<title>' + nameEsc + '</title>\n<style>' + css(width) + '\n' + bandCss + '</style>\n</head>\n<body>\n' +
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
          '<button id="fzMinus" data-fs="-" aria-label="Achicar">A−</button>' +
          '<button id="fzPlus" data-fs="+" aria-label="Agrandar">A+</button>' +
        '</div>' +
        '<div class="set-label set-vista">Vista</div>' +
        '<div class="set-row set-vista">' +
          '<button data-mode="guiada">Guiada</button>' +
          '<button data-mode="limpia">Limpia</button>' +
        '</div>' +
        '<div class="set-label">Varios</div>' +
        '<button class="set-fav" id="favBtn" hidden></button>' +
        '<button class="set-refresh" id="refreshBtn">Actualizar</button>' +
        '<button class="set-install" id="installBtn" hidden>Instalar en el dispositivo</button>' +
      '</div>' +
    '</div>\n' +
    '<div class="stage">' +
      '<div class="histwrap" id="histWrap">' +
        '<aside class="history" id="history"></aside>' +
        '<div class="toggles">' +
          '<button class="tog tog-index" id="togIndex" aria-label="Índice"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg><span class="tog-label">Índice</span></button>' +
          '<button class="tog tog-session" id="togSession" aria-label="Historial"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg><span class="tog-label">Historial</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="viewport"><div class="track" id="track"></div></div>' +
      '<div class="favwrap" id="favWrap">' +
        '<div class="toggles fav-toggles">' +
          '<button class="tog fav-tog" id="favTog" aria-label="Favoritos"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg><span class="tog-label">Favoritos</span></button>' +
        '</div>' +
        '<aside class="favpanel" id="favpanel"></aside>' +
      '</div>' +
      '<div class="hist-backdrop" id="histBackdrop"></div>' +
    '</div>\n' +
    '<div class="pagenav" id="pagenav"></div>\n' +
    '<div class="updbar" id="updbar" hidden><span>Hay una versión nueva</span><button id="updbtn">Actualizar</button></div>\n' +
    '<script>\nvar GUIDE = ' + json + ';\nvar LOGO = ' + JSON.stringify(LOGO) + ';\nvar GUIDE_VER = ' + JSON.stringify(guideVer) + ';\n' + RUNTIME + '\n</script>\n' +
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
