import type { Project } from '@/types';
import { bandColors } from './previewFolio';

/** Reader runtime (vanilla). All navigation is delegated via data-go / data-kind+data-id. */
const RUNTIME = `
var app = document.getElementById('app');
var barTitle = document.getElementById('barTitle');
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
function scard(go, label, sub, cls){
  return '<button class="scard '+(cls||'')+'" data-go="'+go+'">'+esc(label)+(sub?'<small>'+esc(sub)+'</small>':'')+'</button>';
}
function renderMenu(){
  barTitle.textContent = GUIDE.name || 'Guía';
  var main = GUIDE.sections.filter(function(s){ return s.type!=='apendice'; });
  var apx = GUIDE.sections.filter(function(s){ return s.type==='apendice'; });
  var html = '<div class="grid">' + main.map(function(s){ return scard('#/s/'+s.id, s.name, s.folios.length+' folios', 'band-'+s.id); }).join('') + '</div>';
  if(apx.length) html += '<div class="group">Apéndices</div><div class="grid">' + apx.map(function(s){ return scard('#/s/'+s.id, s.name, s.folios.length+' folios', 'band-'+s.id); }).join('') + '</div>';
  app.innerHTML = html; pagenav.innerHTML = ''; if(scroller) scroller.scrollTop = 0;
}
function renderSection(id){
  var s = sectionById(id); if(!s) return renderMenu();
  barTitle.textContent = s.name;
  var html = '<h1 class="band band-'+s.id+'">'+esc(s.name)+'</h1>';
  html += '<div class="grid">' + s.folios.map(function(f){ return scard('#/f/'+f.id, f.title||'(sin título)'); }).join('') + '</div>';
  app.innerHTML = html;
  pagenav.innerHTML = '<button data-go="#/">\\u2302 Inicio</button>';
  if(scroller) scroller.scrollTop = 0;
}
function renderFolio(id){
  var r = findFolio(id); if(!r) return renderMenu();
  var s = r.section, f = r.folio, i = r.index;
  barTitle.textContent = f.title || s.name;
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
    + '<button '+(prev?'data-go="#/f/'+prev.id+'"':'disabled')+'>\\u2039 Ant.</button>'
    + '<button data-go="#/">\\u2302 Inicio</button>'
    + '<button data-go="#/s/'+s.id+'">'+esc(s.name)+'</button>'
    + '<button '+(next?'data-go="#/f/'+next.id+'"':'disabled')+'>Sig. \\u203a</button>';
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
    display: flex; flex-direction: column; height: 100vh; overflow: hidden;
    background: #e6e8ec; color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 1.5rem; line-height: 1.55;
  }
  @media (prefers-color-scheme: dark) { body { background: #0e1013; color: #e8e8e8; } }
  .scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .topbar {
    flex-shrink: 0; display: flex; align-items: center; gap: 12px;
    background: #dfe2e7; border-bottom: 1px solid rgba(127,127,127,.25);
    padding: 10px 16px; font-size: 1rem;
  }
  @media (prefers-color-scheme: dark) { .topbar { background: #15171c; } }
  .topbar button { cursor: pointer; border: 1px solid rgba(127,127,127,.3); background: transparent; color: inherit; border-radius: 8px; padding: 6px 12px; font-size: 1rem; }
  .topbar .t { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wrap { max-width: ${width}; margin: 0 auto; padding: 28px 32px 48px; min-height: 100%; background: #ffffff; }
  @media (prefers-color-scheme: dark) { .wrap { background: #16181d; } }
  h1.band { font-size: 2.1rem; text-align: center; font-weight: 700; padding: .12em .8em; margin: 0 5% 1em; }
  .body p { margin: 0 0 .7em; }
  .body p:empty::before { content: "\\00a0"; }
  .body ul { list-style: disc; padding-left: 1.4em; }
  .body ol { list-style: decimal; padding-left: 1.4em; }
  .body li { margin: .15em 0; }
  .body hr { border: none; border-top: 2px solid rgba(127,127,127,.4); margin: .9em 0; }
  .body strong { font-weight: 700; } .body em { font-style: italic; }
  a.internal-link { color: #2f6f9f; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
  @media (prefers-color-scheme: dark) { a.internal-link { color: #5aa0d6; } }
  .grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 8px; }
  @media (min-width: 600px) { .grid { grid-template-columns: 1fr 1fr; } }
  .scard { cursor: pointer; text-align: left; border: 1px solid rgba(127,127,127,.22); border-radius: 12px; padding: 16px 18px; font-size: 1.15rem; font-weight: 600; color: inherit; background: #fff; }
  @media (prefers-color-scheme: dark) { .scard { background: #1b1e24; } }
  .scard small { display: block; font-weight: 400; opacity: .7; font-size: .8rem; margin-top: 4px; }
  .group { font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; opacity: .6; margin: 1.8em 0 .3em; }
  .links { display: flex; flex-wrap: wrap; gap: 10px; margin: 1.2em 0; }
  .linkbtn { cursor: pointer; border: 1px solid rgba(127,127,127,.35); background: transparent; color: inherit; border-radius: 10px; padding: 10px 16px; font-size: 1.05rem; }
  .pagenav {
    flex-shrink: 0; display: flex; justify-content: center; gap: 8px; padding: 10px 16px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    background: #dfe2e7; border-top: 1px solid rgba(127,127,127,.28);
  }
  @media (prefers-color-scheme: dark) { .pagenav { background: #15171c; } }
  .pagenav:empty { display: none; }
  .pagenav button { flex: 1; max-width: calc(${width} / 3); cursor: pointer; border: 1px solid rgba(127,127,127,.3); background: #fff; color: inherit; border-radius: 10px; padding: 12px 8px; font-size: 1rem; min-height: 54px; }
  @media (prefers-color-scheme: dark) { .pagenav button { background: #1b1e24; } }
  .pagenav button:disabled { opacity: .4; }
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
    '<title>' + (project.name || 'Guía') + '</title>\n<style>' + css(width) + '\n' + bandCss + '</style>\n</head>\n<body>\n' +
    '<div class="topbar"><button data-go="#/">⌂ Inicio</button><span class="t" id="barTitle"></span></div>\n' +
    '<div class="scroll"><div class="wrap"><div id="app"></div></div></div>\n' +
    '<div class="pagenav" id="pagenav"></div>\n' +
    '<script>\nvar GUIDE = ' + json + ';\n' + RUNTIME + '\n</script>\n' +
    '</body>\n</html>';

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
