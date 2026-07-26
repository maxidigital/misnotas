import type { Project } from '@/types';
import { bandColors } from './previewFolio';
import { LOGO } from '@/logo';

/** Reader runtime (vanilla). All navigation is delegated via data-go / data-kind+data-id. */
const RUNTIME = `
var app = document.getElementById('app');
var crumbs = document.getElementById('crumbs');
var pagenav = document.getElementById('pagenav');
var scroller = document.querySelector('.scroll');
function esc(t){ return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function sectionById(id){ for(var i=0;i<GUIDE.sections.length;i++){ if(GUIDE.sections[i].id===id) return GUIDE.sections[i]; } return null; }
function findFolio(id){
  for(var i=0;i<GUIDE.sections.length;i++){
    var s=GUIDE.sections[i];
    for(var j=0;j<s.folios.length;j++){ if(s.folios[j].id===id) return { section:s, folio:s.folios[j], index:j }; }
  }
  return null;
}
function crumbLink(label, go){ return '<button class="crumb" data-go="'+go+'">'+esc(label)+'</button>'; }
function crumbCur(label){ return '<span class="crumb cur">'+esc(label)+'</span>'; }
function crumbHome(current){ return current ? '<span class="crumb cur">\\u2302 Inicio</span>' : '<button class="crumb" data-go="#/">\\u2302 Inicio</button>'; }
function csep(){ return '<span class="csep">\\u203a</span>'; }
function scard(go, label, sub, cls){
  return '<button class="scard '+(cls||'')+'" data-go="'+go+'"><span class="scard-main">'
    + esc(label) + (sub?'<small>'+esc(sub)+'</small>':'')
    + '</span><span class="scard-arrow">\\u203a</span></button>';
}
function renderMenu(){
  crumbs.innerHTML = crumbHome(true);
  var main = GUIDE.sections.filter(function(s){ return s.type!=='apendice'; });
  var apx = GUIDE.sections.filter(function(s){ return s.type==='apendice'; });
  var html = '<div class="menuhead"><img class="menu-logo" src="'+LOGO+'" alt=""><div class="menu-title">'+esc(GUIDE.name||'Gu\\u00eda')+'</div></div>';
  html += '<div class="grid">' + main.map(function(s){ return scard('#/s/'+s.id, s.name, s.folios.length+' folios', 'band-'+s.id); }).join('') + '</div>';
  if(apx.length) html += '<div class="group">Ap\\u00e9ndices</div><div class="grid">' + apx.map(function(s){ return scard('#/s/'+s.id, s.name, s.folios.length+' folios', 'band-'+s.id); }).join('') + '</div>';
  app.innerHTML = html; pagenav.innerHTML = ''; if(scroller) scroller.scrollTop = 0;
}
function renderSection(id){
  var s = sectionById(id); if(!s) return renderMenu();
  crumbs.innerHTML = crumbHome(false) + csep() + crumbCur(s.name);
  var html = '<h1 class="band band-'+s.id+'">'+esc(s.name)+'</h1>';
  html += '<div class="grid">' + s.folios.map(function(f){ return scard('#/f/'+f.id, f.title||'(sin t\\u00edtulo)'); }).join('') + '</div>';
  app.innerHTML = html;
  pagenav.innerHTML = '<button data-go="#/">\\u2302 Inicio</button>';
  if(scroller) scroller.scrollTop = 0;
}
function renderFolio(id){
  var r = findFolio(id); if(!r) return renderMenu();
  var s = r.section, f = r.folio, i = r.index;
  crumbs.innerHTML = crumbHome(false) + csep() + crumbLink(s.name, '#/s/'+s.id) + csep() + crumbCur(f.title||'');
  var html = '<h1 class="band band-'+s.id+'">'+esc(f.title||'')+'</h1>';
  html += '<div class="body">'+(f.body||'')+'</div>';
  if(f.links && f.links.length){
    html += '<div class="links">' + f.links.map(function(l){
      return '<button class="linkbtn" data-kind="'+l.target.kind+'" data-id="'+l.target.id+'">'+esc(l.label||'Ir')+'</button>';
    }).join('') + '</div>';
  }
  var prev = i>0 ? s.folios[i-1] : null;
  var next = i<s.folios.length-1 ? s.folios[i+1] : null;
  app.innerHTML = html;
  pagenav.innerHTML = ''
    + '<button class="nav-side" '+(prev?'data-go="#/f/'+prev.id+'"':'disabled')+'>\\u2039 Ant.</button>'
    + '<button class="nav-side" data-go="#/">\\u2302 Inicio</button>'
    + '<button class="nav-side" data-go="#/s/'+s.id+'">'+esc(s.name)+'</button>'
    + '<button class="nav-next" '+(next?'data-go="#/f/'+next.id+'"':'disabled')+'>Sig. \\u203a</button>';
  if(scroller) scroller.scrollTop = 0;
}
function render(){
  var parts = (location.hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(parts[0]==='f' && parts[1]) return renderFolio(parts[1]);
  if(parts[0]==='s' && parts[1]) return renderSection(parts[1]);
  return renderMenu();
}
document.addEventListener('click', function(e){
  var g = e.target.closest('[data-go]');
  if(g){ location.hash = g.getAttribute('data-go'); return; }
  var a = e.target.closest('a.internal-link, [data-kind][data-id]');
  if(a){
    e.preventDefault();
    var k = a.getAttribute('data-kind'), id = a.getAttribute('data-id');
    if(id) location.hash = (k==='section'?'#/s/':'#/f/') + id;
  }
});
document.addEventListener('keydown', function(e){
  var parts = (location.hash||'').replace(/^#/,'').split('/').filter(Boolean);
  if(parts[0]!=='f' || !parts[1]) return;
  var r = findFolio(parts[1]); if(!r) return;
  if(e.key==='ArrowLeft' && r.index>0) location.hash = '#/f/'+r.section.folios[r.index-1].id;
  if(e.key==='ArrowRight' && r.index<r.section.folios.length-1) location.hash = '#/f/'+r.section.folios[r.index+1].id;
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
  .scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }

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

  /* Reading sheet (card) */
  .wrap {
    max-width: ${width}; margin: 24px auto; padding: 30px 34px 40px;
    background: #FBF7EE; border: 1px solid rgba(120,105,80,.16); border-radius: 18px;
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
    flex: 1; max-width: calc(${width} / 3); cursor: pointer;
    border: 1px solid rgba(120,105,80,.28); background: #FBF7EE; color: inherit;
    border-radius: 12px; padding: 12px 8px; font-size: 1rem; min-height: 54px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  @media (prefers-color-scheme: dark) { .pagenav button { background: #2A2D34; border-color: rgba(255,255,255,.10); } }
  .pagenav button.nav-next { font-weight: 700; border-color: rgba(120,105,80,.5); }
  @media (prefers-color-scheme: dark) { .pagenav button.nav-next { border-color: rgba(255,255,255,.24); } }
  .pagenav button:not(:disabled):hover { border-color: rgba(120,105,80,.55); }
  .pagenav button:disabled { opacity: .38; }
  /* En pantallas chicas: barra más compacta y sin el botón de sección (ya está en el breadcrumb) */
  @media (max-width: 560px) {
    .pagenav { gap: 6px; padding-left: 10px; padding-right: 10px; }
    .pagenav button { padding: 10px 6px; font-size: .92rem; min-height: 50px; max-width: none; }
    .pagenav button.nav-side:nth-child(3) { display: none; }
  }
`;
}

/** Builds the full navigable guide and opens it in a new browser tab. */
export function openGuide(project: Project) {
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
    '<div class="scroll"><div class="wrap"><div id="app"></div></div></div>\n' +
    '<div class="pagenav" id="pagenav"></div>\n' +
    '<script>\nvar GUIDE = ' + json + ';\nvar LOGO = ' + JSON.stringify(LOGO) + ';\n' + RUNTIME + '\n</script>\n' +
    '</body>\n</html>';

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
