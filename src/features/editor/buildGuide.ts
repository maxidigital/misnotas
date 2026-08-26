import type { Project } from '@/types';
import { bandColors } from './previewFolio';
import { LOGO } from '@/logo';
import { PALETTE_TEXT } from '@/lib/palette';

/** Reader runtime (vanilla). Navigation via data-go / data-kind+data-id, plus a
 *  finger-following horizontal carousel (prev | current | next) for folios. */
const RUNTIME = `
var crumbs = document.getElementById('crumbs');
var pagenav = document.getElementById('pagenav');
var viewport = document.querySelector('.viewport');
var track = document.getElementById('track');
var histPanel = document.getElementById('history');
var histBackdrop = document.getElementById('histBackdrop');
var menuBtn = document.getElementById('menuBtn');
var settings = document.getElementById('settings');
var histWrap = document.getElementById('histWrap');
var togIndex = document.getElementById('togIndex');
var togSession = document.getElementById('togSession');
var favWrap = document.getElementById('favWrap');
var favPanel = document.getElementById('favpanel');
var favTog = document.getElementById('favTog');
var about = document.getElementById('about');
var aboutBtn = document.getElementById('aboutBtn');
var helpBtn = document.getElementById('helpBtn');
var aboutDate = document.getElementById('aboutDate');
var aboutMsg = document.getElementById('aboutMsg');
var aboutAction = document.getElementById('aboutAction');
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

/* ---- búsqueda: texto plano por folio (para snippet) + versión normalizada (para matchear) ---- */
function norm(t){ return (t||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,''); }
function stripHtml(html){ var d=document.createElement('div'); d.innerHTML=html||''; return d.textContent||''; }
FLAT.forEach(function(item){
  // normalize('NFC'): el texto de origen a veces trae acentos ya descompuestos (letra +
  // marca combinante suelta, p.ej. copiado de otra fuente); sin esto, plain y plainNorm
  // pueden quedar de distinta longitud y el resaltado del snippet se desalinea.
  item.plain = ((item.f.title ? item.f.title+'. ' : '') + stripHtml(item.f.body)).normalize('NFC');
  item.plainNorm = norm(item.plain);
  item.fullSearch = norm(item.s.name) + ' ' + item.plainNorm;
});
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
function buildTreeHtml(){
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
  var html = main.map(row).join('');
  if(apx.length){ html += '<div class="tree-group">Ap\\u00e9ndices</div>' + apx.map(row).join(''); }
  return html;
}
/* ---- búsqueda dentro del panel Índice ---- */
var idxQuery = '';
function wordsOf(q){ return norm(q).split(/\\s+/).filter(function(w){ return w.length>0; }); }
// Palabras de 1-2 letras ("de", "la", "el"...) son casi siempre muy comunes: buscarlas en
// el cuerpo del folio inundaría los resultados con casi cualquier folio de la guía.
function bodyWords(words){ return words.filter(function(w){ return w.length>=3; }); }
function titleScore(item, words){
  var t = norm(item.f.title||'');
  var n = 0;
  for(var i=0;i<words.length;i++){ if(t.indexOf(words[i])!==-1) n++; }
  return n;
}
function isWordChar(c){ return !!c && /[a-z0-9]/.test(c); }
/* 2 = palabra entera, 1 = arranca una palabra (prefijo), 0 = solo aparece a mitad
   de otra palabra (ej. "mente" dentro de "suavemente") — para que un match más
   "de palabra completa" gane por sobre uno que es pura coincidencia de substring. */
function boundaryScore(text, w){
  if(!text || !w) return 0;
  var best = 0, from = 0, idx;
  while((idx = text.indexOf(w, from)) !== -1){
    var leftOk = idx===0 || !isWordChar(text[idx-1]);
    var rightOk = (idx+w.length===text.length) || !isWordChar(text[idx+w.length]);
    var s = (leftOk && rightOk) ? 2 : (leftOk ? 1 : 0);
    if(s>best) best = s;
    if(best===2) break;
    from = idx + w.length;
  }
  return best;
}
/* Orden de resultados: 1) título (como antes), 2) calidad del match en el cuerpo
   (palabra entera > empieza la palabra > solo a mitad), 3) orden de la guía. */
function matchScore(item, words){
  var bw = bodyWords(words);
  var titleN = norm(item.f.title||'');
  var t = 0, b = 0;
  for(var i=0;i<words.length;i++){ t += boundaryScore(titleN, words[i]); }
  for(var i=0;i<bw.length;i++){ b += boundaryScore(item.plainNorm, bw[i]); }
  return t*1000 + b;
}
function matchItems(words){
  var bw = bodyWords(words);
  if(bw.length){
    return FLAT.filter(function(item){
      return bw.every(function(w){ return item.fullSearch.indexOf(w)!==-1; });
    });
  }
  // Solo hay palabras cortas: para no inundar de resultados del cuerpo, cuentan
  // únicamente si aparecen en el título del folio.
  return FLAT.filter(function(item){ return titleScore(item, words) > 0; });
}
function markSnippet(plain, normd, words){
  var hit = new Array(plain.length);
  words.forEach(function(w){
    if(!w) return;
    var from = 0, idx;
    while((idx = normd.indexOf(w, from)) !== -1){
      for(var k=idx; k<idx+w.length && k<hit.length; k++) hit[k] = true;
      from = idx + w.length;
    }
  });
  var out = '', open = false;
  for(var i=0; i<plain.length; i++){
    if(hit[i] && !open){ out += '<mark>'; open = true; }
    if(!hit[i] && open){ out += '</mark>'; open = false; }
    out += esc(plain[i]);
  }
  if(open) out += '</mark>';
  return out;
}
function snippetFor(item, words){
  var bw = bodyWords(words);
  var pos = -1;
  for(var i=0;i<bw.length && pos<0;i++){ pos = item.plainNorm.indexOf(bw[i]); }
  if(pos<0) pos = 0;
  var start = Math.max(0, pos-40), end = Math.min(item.plain.length, pos+90);
  var pre = start>0 ? '\\u2026' : '';
  var post = end<item.plain.length ? '\\u2026' : '';
  return pre + markSnippet(item.plain.slice(start,end), item.plainNorm.slice(start,end), bw) + post;
}
function buildResultsHtml(words){
  var items = matchItems(words);
  if(!items.length){
    return { title: 'Sin resultados', html: '<div class="fav-empty">No se encontr\\u00f3 nada con esas palabras.</div>' };
  }
  // Título primero, después mejor calidad de match (palabra entera > prefijo > mitad
  // de palabra); el resto conserva el orden de la guía (sort es estable).
  items = items.slice().sort(function(a,b){ return matchScore(b,words) - matchScore(a,words); });
  var cur = currentFolioId();
  var html = items.map(function(item){
    var f = item.f, s = item.s;
    return '<button class="hist-item result'+(cur===f.id?' cur':'')+'" data-go="#/f/'+f.id+'">'
      + '<b>'+esc(s.name)+'</b> \\u2014 '+esc(f.title||'(sin t\\u00edtulo)')
      + '<br><small>'+snippetFor(item, words)+'</small></button>';
  }).join('');
  var n = items.length;
  return { title: n+' resultado'+(n===1?'':'s'), html: html };
}
function updateIndexResults(){
  var input = document.getElementById('idxSearch');
  var title = document.getElementById('idxTitle');
  var results = document.getElementById('idxResults');
  var clearBtn = document.getElementById('idxClear');
  if(!results) return;
  idxQuery = input ? input.value : '';
  if(clearBtn) clearBtn.hidden = !idxQuery;
  var words = wordsOf(idxQuery);
  if(!words.length){
    if(title) title.textContent = '\\u00cdndice';
    results.innerHTML = buildTreeHtml();
    return;
  }
  var r = buildResultsHtml(words);
  if(title) title.textContent = r.title;
  results.innerHTML = r.html;
}
function renderIndexPanel(){
  if(!histPanel) return;
  histPanel.innerHTML = '<div class="hist-title" id="idxTitle">\\u00cdndice</div>'
    + '<div class="idx-search"><input id="idxSearch" type="search" inputmode="search" autocomplete="off" placeholder="Buscar">'
    + '<button class="idx-clear" id="idxClear" aria-label="Limpiar b\\u00fasqueda" title="Limpiar" hidden>\\u00d7</button></div>'
    + '<div class="hist-list" id="idxResults"></div>';
  var input = document.getElementById('idxSearch');
  if(input) input.value = idxQuery;
  updateIndexResults();
}
function renderPanel(){ if(panelView==='index') renderIndexPanel(); else renderHistory(); }
/* ---- favoritos (persistidos por guía) ---- */
var FAV = [];
function favKey(){ return 'reader.fav:' + location.pathname; }
try{ var _fv=JSON.parse(localStorage.getItem(favKey())||'[]'); if(_fv && _fv.length) FAV=_fv.filter(function(x){ return typeof x==='string'; }); }catch(e){}
function saveFav(){ try{ localStorage.setItem(favKey(), JSON.stringify(FAV)); }catch(e){} }
function isFav(id){ return !!id && FAV.indexOf(id)!==-1; }
function toggleFav(id){ if(!id) return; if(isFav(id)){ FAV=FAV.filter(function(x){ return x!==id; }); } else { FAV.unshift(id); } saveFav(); updateFavUI(); }
/* Reordenar por posición visible (no por índice crudo de FAV, que puede tener
   ids de folios que ya no existen mezclados). */
function moveFav(id, dir){
  var visible = FAV.filter(function(x){ return !!findFolio(x); });
  var vi = visible.indexOf(id);
  if(vi<0) return;
  var ti = vi + (dir==='up'?-1:1);
  if(ti<0 || ti>=visible.length) return;
  var ai = FAV.indexOf(id), bi = FAV.indexOf(visible[ti]);
  var tmp = FAV[ai]; FAV[ai]=FAV[bi]; FAV[bi]=tmp;
  saveFav();
  renderFav();
}
/* ---- color por favorito (independiente del orden/alta-baja) ---- */
var FAVCOLOR = {};
function favColorKey(){ return 'reader.favcolor:' + location.pathname; }
try{ var _fc=JSON.parse(localStorage.getItem(favColorKey())||'{}'); if(_fc && typeof _fc==='object') FAVCOLOR=_fc; }catch(e){}
function saveFavColor(){ try{ localStorage.setItem(favColorKey(), JSON.stringify(FAVCOLOR)); }catch(e){} }
function favColor(id){ return FAVCOLOR[id] || null; }
function setFavColor(id, color){
  if(color){ FAVCOLOR[id] = color; } else { delete FAVCOLOR[id]; }
  saveFavColor();
  renderFav();
}
/* ---- menú "⋯" por favorito: mover arriba/abajo + color ---- */
var favMenuOpen = null;
function renderFavMenu(id, idx, total){
  var color = favColor(id);
  var swatches = (typeof FAV_COLORS!=='undefined' ? FAV_COLORS : []).map(function(c){
    return '<button class="fav-swatch'+(c===color?' on':'')+'" data-set-color="'+c+'" data-id="'+id+'" style="background:'+c+'" aria-label="Color"></button>';
  }).join('');
  return '<div class="fav-menu">'
    + '<button class="fav-menu-item" data-move="up" data-id="'+id+'"'+(idx===0?' disabled':'')+'>\\u2191 Mover arriba</button>'
    + '<button class="fav-menu-item" data-move="down" data-id="'+id+'"'+(idx===total-1?' disabled':'')+'>\\u2193 Mover abajo</button>'
    + '<div class="fav-swatches">'
      + '<button class="fav-swatch none'+(!color?' on':'')+'" data-set-color="" data-id="'+id+'" aria-label="Sin color">\\u2715</button>'
      + swatches
    + '</div>'
  + '</div>';
}
function renderFav(){
  if(!favPanel) return;
  var cur = currentFolioId();
  var items = FAV.filter(function(id){ return !!findFolio(id); });
  var html = '<div class="hist-title">Favoritos</div>';
  if(items.length){
    html += '<div class="hist-list">' + items.map(function(id, i){
      var r = findFolio(id);
      var color = favColor(id);
      var style = color ? ' style="color:'+color+'"' : '';
      var row = '<div class="fav-row">'
        + '<button class="hist-item'+(id===cur?' cur':'')+'"'+style+' data-go="#/f/'+id+'">'+esc(r.folio.title||'(sin t\\u00edtulo)')+'</button>'
        + '<button class="fav-menu-btn" data-menu-id="'+id+'" aria-label="Opciones">\\u22ef</button>'
        + '</div>';
      if(favMenuOpen===id) row += renderFavMenu(id, i, items.length);
      return row;
    }).join('') + '</div>';
  } else if(cur){
    html += '<div class="fav-empty">A\\u00fan no has marcado ning\\u00fan folio. Usa el bot\\u00f3n de abajo para a\\u00f1adir este.</div>';
  } else {
    html += '<div class="fav-empty">A\\u00fan no has marcado ning\\u00fan folio. Entra en uno y usa el bot\\u00f3n de este panel.</div>';
  }
  // El alta/baja vive en el panel: solo tiene sentido estando en un folio.
  if(cur){
    var on = isFav(cur);
    html += '<button class="fav-btn'+(on?' on':'')+'">'+(on?'\\u2605 Quitar de favoritos':'\\u2606 Marcar como favorito')+'</button>';
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
    if(!ex){ var b=document.createElement('span'); b.className='favstar'; b.setAttribute('aria-hidden','true'); b.title='Favorito'; b.textContent='\\u2605'; wrap.appendChild(b); }
  } else if(ex){ ex.remove(); }
}
function updateFavUI(){ updateStar(); renderFav(); }
function openFav(){ if(histWrap) histWrap.classList.remove('open'); if(favWrap) favWrap.classList.add('open'); if(histBackdrop) histBackdrop.classList.add('open'); renderFav(); }
function closeFav(){ favMenuOpen=null; if(favWrap) favWrap.classList.remove('open'); if(histBackdrop && !(histWrap && histWrap.classList.contains('open'))) histBackdrop.classList.remove('open'); }
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
  html += '<div class="home-help"><a class="help-link" href="/ayuda" target="_blank" rel="noopener">Ayuda</a></div>';
  return html;
}
function sectionInner(s){
  return '<h1 class="band band-'+s.id+'">'+esc(s.name)+'</h1>'
    + '<div class="grid">' + s.folios.map(function(f){ return scard('#/f/'+f.id, f.title||'(sin t\\u00edtulo)'); }).join('') + '</div>';
}
function folioInner(f, s){
  var star = isFav(f.id) ? '<span class="favstar" title="Favorito" aria-hidden="true">\\u2605</span>' : '';
  return star + '<h1 class="folio-title band-'+s.id+'">'+esc(f.title||'')+'</h1>'
    + '<div class="body">'+(f.body||'')+'</div>';
}
function pageFolio(item){ return '<div class="page">'+(item?'<div class="wrap wrap-folio">'+folioInner(item.f,item.s)+'</div>':'')+'</div>'; }

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
function renderMenu(){
  crumbs.innerHTML = '<span class="brand-line"><img class="brand-logo" src="'+LOGO+'" alt=""><span class="brand-name">Instituto Blasco</span></span>';
  setSingle(menuInner()); pagenav.className='pagenav'; pagenav.innerHTML='';
}
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
  renderFav();
  var parts = (location.hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(parts[0]==='f' && parts[1]) return renderFolio(parts[1]);
  if(parts[0]==='s' && parts[1]) return renderSection(parts[1]);
  return renderMenu();
}

/* ---- click navigation ---- */
if(histBackdrop) histBackdrop.addEventListener('click', function(){ closePanel(); closeFav(); });
if(favTog) favTog.addEventListener('click', function(e){ e.stopPropagation(); if(favWrap && favWrap.classList.contains('open')) closeFav(); else openFav(); });
if(favPanel) favPanel.addEventListener('click', function(e){
  if(e.target.closest('.fav-btn')){ e.stopPropagation(); toggleFav(currentFolioId()); return; }
  var mb=e.target.closest('.fav-menu-btn');
  if(mb){ e.stopPropagation(); var mid=mb.getAttribute('data-menu-id'); favMenuOpen=(favMenuOpen===mid)?null:mid; renderFav(); return; }
  var mv=e.target.closest('[data-move]');
  if(mv){ e.stopPropagation(); moveFav(mv.getAttribute('data-id'), mv.getAttribute('data-move')); return; }
  var sc=e.target.closest('[data-set-color]');
  if(sc){ e.stopPropagation(); setFavColor(sc.getAttribute('data-id'), sc.getAttribute('data-set-color')); }
});
document.addEventListener('click', function(e){
  if(favMenuOpen && !e.target.closest('.fav-menu') && !e.target.closest('.fav-menu-btn')){ favMenuOpen=null; renderFav(); }
});
function togHandler(view){ return function(e){
  e.stopPropagation();
  if(histWrap && histWrap.classList.contains('open') && panelView===view) closePanel();
  else openPanel(view);
}; }
if(togIndex) togIndex.addEventListener('click', togHandler('index'));
if(togSession) togSession.addEventListener('click', togHandler('session'));
if(histPanel) histPanel.addEventListener('click', function(e){
  var sec=e.target.closest('.tree-sec');
  if(sec){ e.stopPropagation(); var sid=sec.getAttribute('data-sec'); treeOpen[sid]=!treeOpen[sid]; updateIndexResults(); return; }
  if(e.target.closest('.hist-clear')){ e.stopPropagation(); clearHist(); return; }
  if(e.target.closest('#idxClear')){
    e.stopPropagation();
    var input=document.getElementById('idxSearch');
    if(input){ input.value=''; input.focus(); }
    updateIndexResults();
  }
});
if(histPanel) histPanel.addEventListener('input', function(e){
  if(e.target && e.target.id==='idxSearch'){ updateIndexResults(); }
});
document.addEventListener('click', function(e){
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
  if(e.key==='Escape'){ closePanel(); closeFav(); closeAbout(); }
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
  if(axis===null){ if(Math.abs(dx)<8 && Math.abs(dy)<8) return; axis = Math.abs(dx)>Math.abs(dy) ? 'x' : 'y'; }
  if(axis!=='x') return;               // vertical → dejar el scroll normal
  // Horizontal: frenar el gesto nativo del navegador (si no, en pantallas sin
  // carrusel puede "robarse" el touch y touchend termina con coordenadas poco
  // confiables, rompiendo la distinción tap/drag de más abajo).
  e.preventDefault();
  if(!swipable) return;                // sin folio no hay carrusel que animar
  dragging=true;
  var d=dx; if((d>0&&!hasPrev)||(d<0&&!hasNext)) d*=0.28;   // resistencia en los extremos
  track.style.transform = 'translateX('+(-W+d)+'px)';
}, {passive:false});
viewport.addEventListener('touchend', function(e){
  // "moved" depende de haber recibido touchmove; en pantallas sin swipe (Inicio/
  // sección) nunca se llama preventDefault(), así que un flick rápido puede
  // llegarle al navegador con pocos o ningún touchmove y dejar moved en false
  // aunque el dedo sí se haya desplazado. Se refuerza con la distancia real
  // entre el toque inicial y el final.
  var ex=e.changedTouches[0].clientX, ey=e.changedTouches[0].clientY;
  var reallyMoved = moved || Math.abs(ex-sx)>10 || Math.abs(ey-sy)>10;
  // tap (sin arrastrar) en la banda izquierda → arriba: Índice, abajo: Sesión
  if(!reallyMoved && startLeft && !(histWrap && histWrap.classList.contains('open'))
     && !e.target.closest('a, button')){
    openPanel(startTop ? 'index' : 'session'); dragging=false; return;
  }
  // tap en la banda derecha → Favoritos
  if(!reallyMoved && startRight && !(favWrap && favWrap.classList.contains('open'))
     && !e.target.closest('a, button')){
    openFav(); dragging=false; return;
  }
  if(!swipable || !dragging){ dragging=false; return; }
  dragging=false;
  var dx=e.changedTouches[0].clientX-sx;
  var TH=Math.max(60, W*0.30);
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
function currentVisual(){ return root.getAttribute('data-visual')==='nuevo' ? 'nuevo' : 'clasico'; }
function syncSettings(){
  if(!settings) return;
  var t=currentTheme(), bs=settings.querySelectorAll('[data-theme]');
  for(var i=0;i<bs.length;i++){ bs[i].classList.toggle('active', bs[i].getAttribute('data-theme')===t); }
  var m=currentMode(), ms=settings.querySelectorAll('[data-mode]');
  for(var j=0;j<ms.length;j++){ ms[j].classList.toggle('active', ms[j].getAttribute('data-mode')===m); }
  var vv=currentVisual(), vs=settings.querySelectorAll('[data-visual]');
  for(var k=0;k<vs.length;k++){ vs[k].classList.toggle('active', vs[k].getAttribute('data-visual')===vv); }
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
function applyVisual(v){
  if(v!=='nuevo') v='clasico';
  if(v==='nuevo'){ root.setAttribute('data-visual', 'nuevo'); } else { root.removeAttribute('data-visual'); }
  try{ localStorage.setItem('reader.visual', v); }catch(e){}
  syncSettings();
}
function applyFZ(v){
  FZ = Math.max(0.8, Math.min(1.4, Math.round(v*10)/10));
  root.style.setProperty('--fz', String(FZ));
  try{ localStorage.setItem('reader.fz', String(FZ)); }catch(e){}
}
/* Tema y modo ya vienen puestos en <html> por el script de la cabecera. Acá solo se
   recupera FZ, que además de la variable CSS necesita el valor en memoria para A+/A-. */
try{ var _f=parseFloat(localStorage.getItem('reader.fz')); if(_f) applyFZ(_f); }catch(e){}
syncSettings();
if(menuBtn) menuBtn.addEventListener('click', function(e){ e.stopPropagation(); if(settings){ settings.hidden=!settings.hidden; syncSettings(); } });
if(settings) settings.addEventListener('click', function(e){
  e.stopPropagation();
  var t=e.target.closest('[data-theme]'); if(t && settings.contains(t)){ applyTheme(t.getAttribute('data-theme')); return; }
  var f=e.target.closest('[data-fs]'); if(f && settings.contains(f)){ applyFZ(FZ + (f.getAttribute('data-fs')==='+'?0.1:-0.1)); return; }
  var md=e.target.closest('[data-mode]'); if(md && settings.contains(md)){ applyMode(md.getAttribute('data-mode')); return; }
  var vd=e.target.closest('[data-visual]'); if(vd && settings.contains(vd)){ applyVisual(vd.getAttribute('data-visual')); return; }
});
/* listeners directos, a prueba de balas, para A- / A+ */
var fzMinus=document.getElementById('fzMinus'), fzPlus=document.getElementById('fzPlus'), fzReset=document.getElementById('fzReset');
if(fzMinus) fzMinus.addEventListener('click', function(e){ e.stopPropagation(); applyFZ(FZ-0.1); });
if(fzPlus) fzPlus.addEventListener('click', function(e){ e.stopPropagation(); applyFZ(FZ+0.1); });
if(fzReset) fzReset.addEventListener('click', function(e){ e.stopPropagation(); applyFZ(1); });
document.addEventListener('click', function(e){
  if(settings && !settings.hidden && !(menuBtn && menuBtn.contains(e.target)) && !settings.contains(e.target)) settings.hidden=true;
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
/* Actualizar a prueba de balas: desregistra el SW, borra CacheStorage y recarga
   con un parámetro anti-caché (esquiva el cacheo agresivo de iOS standalone). */
function hardReload(){
  var bust = location.pathname + '?v=' + Date.now() + (location.hash || '');
  var done = false;
  function finish(){ if(done) return; done = true; location.replace(bust); }
  try{
    var tasks = [];
    if('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations){
      tasks.push(navigator.serviceWorker.getRegistrations().then(function(rs){
        return Promise.all(rs.map(function(r){ return r.unregister(); }));
      }).catch(function(){}));
    }
    if(window.caches && caches.keys){
      tasks.push(caches.keys().then(function(ks){
        return Promise.all(ks.map(function(k){ return caches.delete(k); }));
      }).catch(function(){}));
    }
    if(tasks.length){ Promise.all(tasks).then(finish, finish); setTimeout(finish, 1500); return; }
  }catch(_){}
  finish();
}
/* ---- "Acerca de": fecha de esta versión + comprobar si hay una nueva ---- */
var hayNueva = false;   // pasa a true cuando se detecta una versión más nueva publicada
/* La versión ES la fecha de publicación, así que se muestra tal cual, con segundos. */
function fmtBuilt(){
  try{
    var d = new Date(GUIDE_VER);
    if(isNaN(d.getTime())) return '\\u2014';
    return d.toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }catch(e){ return '\\u2014'; }
}
function aboutSay(t, ok){
  if(!aboutMsg) return;
  aboutMsg.textContent = t;
  aboutMsg.className = 'about-msg' + (ok ? ' ok' : '');
}
function syncAbout(){
  if(!aboutAction) return;
  aboutAction.textContent = hayNueva ? 'Actualizar' : 'Comprobar actualizaciones';
  aboutAction.classList.toggle('go', hayNueva);
}
function openAbout(){
  if(!about) return;
  if(settings) settings.hidden = true;
  if(aboutDate) aboutDate.textContent = fmtBuilt();
  aboutSay(hayNueva ? 'Hay una versi\\u00f3n nueva.' : '', false);
  syncAbout();
  about.hidden = false;
}
function closeAbout(){ if(about) about.hidden = true; }
// El manual también está enlazado en la pantalla de inicio; desde acá se llega estando
// en cualquier folio, que es donde suele hacer falta.
if(helpBtn) helpBtn.addEventListener('click', function(e){
  e.stopPropagation();
  if(settings) settings.hidden = true;
  window.open('/ayuda', '_blank', 'noopener');
});
if(aboutBtn) aboutBtn.addEventListener('click', function(e){ e.stopPropagation(); openAbout(); });
// No hay botón de cerrar: se cierra tocando fuera de la tarjeta (o con Escape).
if(about) about.addEventListener('click', function(e){ if(e.target===about) closeAbout(); });
if(aboutAction) aboutAction.addEventListener('click', function(e){
  e.stopPropagation();
  if(hayNueva){ hardReload(); return; }
  aboutAction.disabled = true;
  aboutSay('Comprobando\\u2026', false);
  remoteVer().then(function(v){
    aboutAction.disabled = false;
    if(!v){ aboutSay('No se pudo comprobar. \\u00bfEst\\u00e1s sin conexi\\u00f3n?', false); return; }
    if(v !== GUIDE_VER){
      hayNueva = true;
      aboutSay('Hay una versi\\u00f3n nueva.', false);
    } else {
      aboutSay('Ya tienes la \\u00faltima versi\\u00f3n.', true);
    }
    syncAbout();
  });
});
var deferredPrompt=null, installBtn=document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredPrompt=e; if(installBtn) installBtn.hidden=false; });
if(installBtn) installBtn.addEventListener('click', function(e){
  e.stopPropagation();
  if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; installBtn.hidden=true; }
});
window.addEventListener('appinstalled', function(){ if(installBtn) installBtn.hidden=true; });

/* ---- aviso "Añadir a inicio" en iOS (Safari no dispara beforeinstallprompt) ---- */
(function(){
  var iosEl = document.getElementById('iosInstall');
  if(!iosEl) return;
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (/(macintosh)/i.test(ua) && 'ontouchend' in document);
  var standalone = false;
  try{ standalone = (navigator.standalone === true) || (!!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }catch(e){}
  var dismissed = false; try{ dismissed = localStorage.getItem('reader.iosInstall')==='1'; }catch(e){}
  if(isIOS && !standalone && !dismissed){ setTimeout(function(){ iosEl.hidden=false; }, 1800); }
  var x = document.getElementById('iosInstallClose');
  if(x) x.addEventListener('click', function(){ iosEl.hidden=true; try{ localStorage.setItem('reader.iosInstall','1'); }catch(e){} });
})();

/* Versión publicada ahora mismo en el servidor ('' si no se pudo averiguar).
   Solo se consulta cuando el lector la pide a mano desde "Acerca de": nunca se le
   avisa por su cuenta de que hay una versión nueva. */
function remoteVer(){
  try{
    // Unos pocos bytes en vez de la guía entera. Un servidor que no conozca esta ruta
    // responde 200 con el HTML de la SPA, así que no alcanza con mirar el status: si lo
    // que vuelve no tiene pinta de versión, se usa el respaldo.
    return fetch(location.pathname + '/ver', { cache:'no-store' })
      .then(function(r){ return r.ok ? r.text() : ''; })
      .then(function(t){
        t = (t||'').trim();
        return (t && t.length < 64 && t.indexOf('<') === -1) ? t : verFromPage();
      })
      .catch(function(){ return verFromPage(); });
  }catch(e){ return Promise.resolve(''); }
}
/* Respaldo: leer el número del HTML publicado (guías servidas por algo que no conoce /ver). */
function verFromPage(){
  return fetch(location.pathname, { cache:'no-store' }).then(function(r){ return r.ok ? r.text() : ''; }).then(function(t){
    var m = t.match(/GUIDE_VER\\s*=\\s*"([^"]+)"/);
    return (m && m[1]) ? m[1] : '';
  }).catch(function(){ return ''; });
}

window.addEventListener('hashchange', render);
render();
`;

function css(width: string): string {
  return `
  :root {
    color-scheme: light dark;
    /* Paleta Underwater (design/PALETTE.md en el repo underwater), acento Celeste. */
    --bg:#F2F0F5; --fg:#17151D;
    --bar:#FBFAFD; --bar-bd:#E4E1EA;
    --hover:rgba(23,21,29,.15);
    --sheet:#FBFAFD; --sheet-bd:#E4E1EA;
    --sheet-sh:0 1px 2px rgba(23,21,29,.05), 0 10px 30px rgba(23,21,29,.07);
    --card:#FBFAFD; --card-bd:#E4E1EA; --card-bd-h:rgba(23,21,29,.42);
    --card-sh:0 4px 14px rgba(23,21,29,.10);
    --btn:#FFFFFF; --btn-bd:#E4E1EA; --btn-bd-strong:rgba(23,21,29,.5);
    --link:#0369A1; --ok:#2E7D4F; --logo-invert:0; --fz:1; --histw:min(80vw, 300px); --selected:#0369A1;
    --text-muted:#6B6572;
  }
  /* variables de tema oscuro (reutilizadas por auto y por override manual) */
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg:#09090B; --fg:#F5F3F7;
      --bar:#141318; --bar-bd:#2B2733;
      --hover:rgba(245,243,247,.09);
      --sheet:#141318; --sheet-bd:#2B2733;
      --sheet-sh:0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.28);
      --card:#141318; --card-bd:#2B2733; --card-bd-h:rgba(245,243,247,.20);
      --card-sh:0 4px 14px rgba(0,0,0,.35);
      --btn:#1D1A22; --btn-bd:#2B2733; --btn-bd-strong:rgba(245,243,247,.24);
      --link:#38BDF8; --ok:#5FBF87; --logo-invert:1;
      --text-muted:#A6A1AD;
    }
  }
  :root[data-theme="dark"] {
    --bg:#09090B; --fg:#F5F3F7;
    --bar:#141318; --bar-bd:#2B2733;
    --hover:rgba(245,243,247,.09);
    --sheet:#141318; --sheet-bd:#2B2733;
    --sheet-sh:0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.28);
    --card:#141318; --card-bd:#2B2733; --card-bd-h:rgba(245,243,247,.20);
    --card-sh:0 4px 14px rgba(0,0,0,.35);
    --btn:#1D1A22; --btn-bd:#2B2733; --btn-bd-strong:rgba(245,243,247,.24);
    --link:#38BDF8; --ok:#5FBF87; --logo-invert:1;
    --text-muted:#A6A1AD;
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
  .topbar .brand-logo { height: 26px; width: 26px; object-fit: contain; flex-shrink: 0; filter: invert(var(--logo-invert)); }
  /* Botón de menú (tres rayas), a la izquierda de la barra */
  .menubtn {
    flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center;
    border: none; background: transparent; color: inherit; padding: 5px; border-radius: 8px;
  }
  .menubtn:hover { background: var(--hover); }
  .menubtn svg { pointer-events: none; opacity: .85; }
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
  /* Logo + "Instituto Blasco" centrados en TODA la barra (no en el espacio que
     sobra después del botón de menú, que los corría hacia la derecha). Posición
     absoluta respecto a .topbar, ignora el ancho de .crumbs. Solo en Inicio, es
     lo único que pinta .crumbs ahí; en sección/folio crumbs son los breadcrumbs
     de siempre y no llevan esta clase. */
  .brand-line {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    display: flex; align-items: center; gap: 8px;
    max-width: calc(100% - 96px); overflow: hidden; white-space: nowrap;
  }

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
  .settings .set-install, .settings .set-about, .settings .set-help { flex: 0 0 auto; margin-top: 2px; }
  .set-install[hidden] { display: none; }
  /* Modal de "Acerca de" */
  .modal {
    position: fixed; inset: 0; z-index: 80; padding: 20px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,.45);
  }
  .modal[hidden] { display: none; }
  .modal-card {
    width: 100%; max-width: 380px; padding: 18px;
    background: var(--sheet); color: var(--fg);
    border: 1px solid var(--sheet-bd); border-radius: 16px;
    box-shadow: 0 18px 50px rgba(0,0,0,.4); font-size: 1rem;
  }
  .modal-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 12px; }
  .about-name { font-weight: 600; margin-bottom: 12px; }
  .about-row { display: flex; flex-direction: column; gap: 2px; }
  .about-row span { opacity: .55; font-size: .72rem; text-transform: uppercase; letter-spacing: .5px; }
  .about-msg { min-height: 1.5em; margin-top: 10px; font-size: .95rem; opacity: .8; }
  .about-msg.ok { color: var(--ok); opacity: 1; font-weight: 600; }
  .modal-actions { display: flex; gap: 8px; margin-top: 14px; }
  .modal-actions button {
    flex: 1; cursor: pointer; border: 1px solid var(--btn-bd); background: var(--btn); color: inherit;
    border-radius: 10px; padding: 11px 12px; font-family: inherit; font-size: .95rem;
  }
  .modal-actions button:not(:disabled):hover { border-color: var(--btn-bd-strong); }
  .modal-actions button:disabled { opacity: .55; }
  .modal-actions .modal-ok.go { background: var(--selected); border-color: var(--selected); color: #fff; font-weight: 700; }
  /* Aviso para añadir a la pantalla de inicio (iOS) */
  .ios-install {
    position: fixed; left: 12px; right: 12px;
    bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 60;
    display: flex; align-items: center; gap: 10px;
    background: var(--bar); border: 1px solid var(--bar-bd); color: inherit;
    border-radius: 14px; padding: 12px 14px; box-shadow: 0 6px 20px rgba(0,0,0,.28);
    font-size: .92rem; line-height: 1.35;
  }
  .ios-install[hidden] { display: none; }
  .ios-install .ios-msg { flex: 1; min-width: 0; }
  .ios-install .ios-x {
    flex: 0 0 auto; cursor: pointer; border: none; background: transparent; color: inherit;
    font-size: 1.1rem; line-height: 1; padding: 4px 6px; opacity: .6;
  }
  @media (min-width: 560px) { .ios-install { left: 50%; right: auto; transform: translateX(-50%); max-width: 480px; } }
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
  /* Ocupa el hueco para que el botón de marcar quede siempre abajo del todo. */
  .fav-empty { flex: 1; padding: 14px 12px; opacity: .6; font-size: .95rem; line-height: 1.45; }
  .fav-btn {
    flex-shrink: 0; margin-top: 6px; cursor: pointer;
    border: 1px solid var(--btn-bd); background: var(--btn); color: inherit;
    border-radius: 8px; padding: 12px 10px; font-family: inherit; font-size: 1rem;
  }
  .fav-btn:hover { border-color: var(--btn-bd-strong); }
  .fav-btn.on { border-color: #F5B301; font-weight: 700; }
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
  .idx-search { flex-shrink: 0; padding: 4px 8px 8px; position: relative; }
  .idx-search input {
    width: 100%; box-sizing: border-box; font-family: inherit; font-size: .95rem;
    padding: 8px 30px 8px 10px; border-radius: 8px; border: 1px solid var(--btn-bd);
    background: var(--btn); color: inherit; outline: none;
  }
  .idx-search input:focus { border-color: var(--selected); }
  .idx-search input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; }
  .idx-clear {
    position: absolute; top: 50%; right: 14px; transform: translateY(-50%);
    cursor: pointer; border: none; background: transparent; color: inherit;
    font-size: 1.15rem; line-height: 1; padding: 4px 6px; border-radius: 6px; opacity: .55;
  }
  .idx-clear:hover { opacity: .9; background: var(--hover); }
  .idx-clear[hidden] { display: none; }
  .hist-list { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .hist-item {
    display: block; width: 100%; text-align: left; cursor: pointer;
    border: none; background: transparent; color: inherit; font-family: inherit;
    font-size: 1rem; padding: 10px; border-radius: 8px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .hist-item:hover { background: var(--hover); }
  .hist-item.cur { font-weight: 700; box-shadow: inset 3px 0 0 var(--selected); }
  .hist-item.result { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.3; }
  .hist-item.result small { display: block; margin-top: 3px; font-weight: 400; opacity: .68; }
  .hist-item.result mark { background: var(--selected); color: #fff; border-radius: 3px; padding: 0 1px; }
  /* Favoritos: cada fila es el folio + botón "⋯" que despliega mover arriba/abajo
     y color. */
  .fav-row { display: flex; align-items: stretch; gap: 2px; }
  .fav-row .hist-item { flex: 1; width: auto; min-width: 0; }
  .fav-menu-btn {
    flex-shrink: 0; cursor: pointer; border: none; background: transparent; color: inherit;
    font-family: inherit; font-size: 1.1rem; line-height: 1; padding: 0 10px;
    border-radius: 8px; opacity: .6;
  }
  .fav-menu-btn:hover { background: var(--hover); opacity: 1; }
  .fav-menu {
    margin: 2px 0 6px; padding: 6px; border-radius: 10px;
    background: var(--btn); border: 1px solid var(--btn-bd);
    display: flex; flex-direction: column; gap: 2px;
  }
  .fav-menu-item {
    text-align: left; cursor: pointer; border: none; background: transparent; color: inherit;
    font-family: inherit; font-size: .92rem; padding: 8px; border-radius: 6px;
  }
  .fav-menu-item:hover { background: var(--hover); }
  .fav-menu-item:disabled { opacity: .35; cursor: default; }
  .fav-menu-item:disabled:hover { background: transparent; }
  .fav-swatches { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 4px 2px; }
  .fav-swatch {
    width: 22px; height: 22px; border-radius: 999px; cursor: pointer;
    border: 2px solid transparent; padding: 0;
  }
  .fav-swatch.on { border-color: var(--fg); }
  .fav-swatch.none {
    background: transparent !important; border: 1px solid var(--btn-bd);
    display: flex; align-items: center; justify-content: center;
    font-size: .7rem; opacity: .6; color: inherit;
  }
  .fav-swatch.none.on { border-color: var(--fg); opacity: 1; }
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
  /* Folio en tema Nuevo: menos aire arriba que el resto de las pantallas (menú/
     sección), para que el título quede más pegado al borde superior de la hoja.
     En Clásico se deja el padding normal de .wrap, igual que estaba siempre. */
  :root[data-visual="nuevo"] .wrap-folio { padding-top: 16px; }
  .favstar {
    position: absolute; top: 8px; right: 10px; z-index: 3;
    pointer-events: none; color: #F5B301; font-size: 20px; line-height: 1;
    filter: drop-shadow(0 1px 1px rgba(0,0,0,.28));
  }

  .menuhead { text-align: center; margin: 4px 0 24px; }
  .menu-logo { height: 84px; width: 84px; object-fit: contain; filter: invert(var(--logo-invert)); }
  .menu-title { font-size: calc(1.5rem * var(--fz, 1)); font-weight: 700; margin-top: 6px; }
  .home-help { text-align: center; margin-top: 26px; }
  .help-link { color: var(--link); font-size: .95rem; text-decoration: underline; text-underline-offset: 3px; }

  /* Title band, tema Clásico (default): pantalla de sección (lista de folios). */
  h1.band {
    font-size: calc(1.95rem * var(--fz, 1)); text-align: center; font-weight: 700; line-height: 1.2;
    padding: .55em .9em; margin: 0 0 1.1em; border-radius: 16px;
    background: var(--bbg, #ddd); color: var(--btxt, #333);
  }
  /* Título de sección, tema Nuevo: mismo lenguaje que el título del folio (sin caja,
     centrado, cursiva, gris, línea del color de la sección debajo). */
  :root[data-visual="nuevo"] h1.band {
    font-size: calc(1.8rem * var(--fz, 1)); font-weight: 700; font-style: italic; line-height: 1.25;
    text-align: center; color: var(--text-muted, var(--fg));
    background: none; border-radius: 0;
    padding: 0 0 .5em; margin: 0 0 1.1em;
    border-bottom: 3px solid var(--raw, var(--sheet-bd));
  }
  /* Título del folio, tema Clásico (default): misma caja de color que la pantalla
     de sección. */
  h1.folio-title {
    font-size: calc(1.95rem * var(--fz, 1)); text-align: center; font-weight: 700; line-height: 1.2;
    padding: .55em .9em; margin: 0 0 1.1em; border-radius: 16px;
    background: var(--bbg, #ddd); color: var(--btxt, #333);
  }
  /* Título del folio, tema Nuevo: sin caja, centrado, en cursiva y en gris, con una
     línea fina del color de la sección debajo (el hex tal cual lo eligió el
     instructor, no la variante recalculada de --btxt). */
  :root[data-visual="nuevo"] h1.folio-title {
    font-size: calc(1.6rem * var(--fz, 1)); font-weight: 700; font-style: italic; line-height: 1.25;
    text-align: center; color: var(--text-muted, var(--fg));
    background: none; border-radius: 0;
    margin: 0 0 .75em; padding: 0 0 .5em;
    border-bottom: 3px solid var(--raw, var(--sheet-bd));
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
      const raw = s.titleBarColor || '#4a4a4a';
      return (
        // --raw: el color tal cual lo eligió el instructor (mismo en los dos temas),
        // para la línea bajo el título del folio; --bbg/--btxt son variantes
        // recalculadas (saturación/luminosidad ajustadas) para fondo/texto legible.
        `.band-${s.id}{--bbg:${b.lightBg};--btxt:${b.lightText};--raw:${raw};}` +
        `@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .band-${s.id}{--bbg:${b.darkBg};--btxt:${b.darkText};}}` +
        `:root[data-theme="dark"] .band-${s.id}{--bbg:${b.darkBg};--btxt:${b.darkText};}` +
        // Clásico: si la sección tiene color propio, el botón del menú se rellena con ese color.
        (b.colored ? `.scard.band-${s.id}{background:var(--bbg);color:var(--btxt);border-color:transparent;}` : '') +
        // Nuevo: tarjeta neutra (como cualquier otra) con un borde de acento del color
        // de la sección, en vez de rellenarse por completo.
        `:root[data-visual="nuevo"] .scard.band-${s.id}{background:var(--card);color:inherit;border-color:var(--card-bd);border-left-color:${raw};border-left-width:4px;}`
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
  // La versión de una publicación es el momento exacto en que se generó: cambia en cada
  // publicación, se lee de un vistazo y además dice cuál es más nueva.
  const guideVer = new Date().toISOString();

  const nameEsc = (project.name || 'Guía').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html =
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' +
    // Preferencias ANTES del primer pintado: si esto viviera en el script del final,
    // la primera pasada se dibujaría con los valores por defecto (parpadeo de las
    // pestañas de los bordes, del tema y del tamaño de letra).
    '<script>try{var r=document.documentElement,s=localStorage;' +
    "var m=s.getItem('reader.mode');r.setAttribute('data-mode',m==='limpia'?'limpia':'guiada');" +
    "var t=s.getItem('reader.theme');if(t==='light'||t==='dark')r.setAttribute('data-theme',t);" +
    "var v=s.getItem('reader.visual');if(v==='nuevo')r.setAttribute('data-visual','nuevo');" +
    "var f=parseFloat(s.getItem('reader.fz'));if(f)r.style.setProperty('--fz',String(Math.max(0.8,Math.min(1.4,f))));" +
    "}catch(e){document.documentElement.setAttribute('data-mode','guiada');}</script>\n" +
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
      '<button class="menubtn" id="menuBtn" aria-label="Menú" title="Menú">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line></svg>' +
      '</button>' +
      '<nav class="crumbs" id="crumbs"></nav>' +
      '<div class="settings" id="settings" hidden>' +
        '<div class="set-label">Tema</div>' +
        '<div class="set-row">' +
          '<button data-theme="light">Claro</button>' +
          '<button data-theme="dark">Oscuro</button>' +
          '<button data-theme="auto">Auto</button>' +
        '</div>' +
        '<div class="set-label">Estilo</div>' +
        '<div class="set-row">' +
          '<button data-visual="clasico">Cl\\u00e1sico</button>' +
          '<button data-visual="nuevo">Nuevo</button>' +
        '</div>' +
        '<div class="set-label">Texto</div>' +
        '<div class="set-row set-fs">' +
          '<button id="fzMinus" data-fs="-" aria-label="Achicar">A−</button>' +
          '<button id="fzReset" aria-label="Tamaño normal" title="Tamaño normal">A</button>' +
          '<button id="fzPlus" data-fs="+" aria-label="Agrandar">A+</button>' +
        '</div>' +
        '<div class="set-label set-vista">Vista</div>' +
        '<div class="set-row set-vista">' +
          '<button data-mode="guiada">Guiada</button>' +
          '<button data-mode="limpia">Limpia</button>' +
        '</div>' +
        '<div class="set-label">Varios</div>' +
        '<button class="set-help" id="helpBtn">Ayuda</button>' +
        '<button class="set-about" id="aboutBtn">Acerca de…</button>' +
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
    '<div class="modal" id="about" hidden>' +
      '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="aboutTitle">' +
        '<div class="modal-title" id="aboutTitle">Acerca de</div>' +
        '<div class="about-name">' + nameEsc + '</div>' +
        '<div class="about-row"><span>Última actualización</span><b id="aboutDate">—</b></div>' +
        '<div class="about-msg" id="aboutMsg"></div>' +
        '<div class="modal-actions">' +
          '<button class="modal-ok" id="aboutAction">Comprobar actualizaciones</button>' +
        '</div>' +
      '</div>' +
    '</div>\n' +
    // Texto HTML (no JS): va literal, sin escapes \\uXXXX — la página declara charset utf-8.
    '<div class="ios-install" id="iosInstall" hidden><span class="ios-msg">Añade esta guía a tu pantalla de inicio: pulsa <b>Compartir</b> y luego <b>«Añadir a pantalla de inicio»</b>.</span><button class="ios-x" id="iosInstallClose" aria-label="Cerrar">✕</button></div>\n' +
    '<script>\nvar GUIDE = ' + json + ';\nvar LOGO = ' + JSON.stringify(LOGO) + ';\nvar GUIDE_VER = ' + JSON.stringify(guideVer) + ';\n' +
    'var FAV_COLORS = ' + JSON.stringify(PALETTE_TEXT.map((c) => c.value)) + ';\n' + RUNTIME + '\n</script>\n' +
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
