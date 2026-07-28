import type { Folio, Section } from '@/types';
import { resolveTarget } from './linkUtils';

export function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Sober band colors (light + dark) derived from a base hex. Shared by preview and build.
 *  A (near) gray base yields a neutral warm band — no injected hue (fixes the maroon default). */
export function bandColors(hex: string) {
  const { h, s } = hexToHsl(hex || '#4a4a4a');
  if (s < 12) {
    return {
      lightBg: 'hsl(40 12% 89%)',
      lightText: 'hsl(40 9% 28%)',
      darkBg: 'hsl(220 8% 25%)',
      darkText: 'hsl(40 9% 82%)',
      colored: false,
    };
  }
  const sBg = clamp(s, 20, 42);
  return {
    lightBg: `hsl(${h} ${sBg}% 90%)`,
    lightText: `hsl(${h} ${clamp(s, 40, 70)}% 30%)`,
    darkBg: `hsl(${h} ${clamp(sBg, 18, 30)}% 24%)`,
    darkText: `hsl(${h} ${clamp(s, 34, 70)}% 82%)`,
    colored: true,
  };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Convert a #RRGGBB hex to HSL (h in deg, s/l in %). */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return { h: 0, s: 0, l: 30 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

/** Adds a resolved title to each internal link so the preview shows where it points. */
function renderBody(html: string, sections: Section[]): string {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('a.internal-link').forEach((a) => {
    const kind = a.getAttribute('data-kind') === 'section' ? 'section' : 'folio';
    const id = a.getAttribute('data-id') || '';
    a.setAttribute('title', '→ ' + resolveTarget(sections, { kind, id }).label);
  });
  return tpl.innerHTML;
}

/** Opens a standalone preview of a single folio in a new browser tab. */
export function openFolioPreview(
  folio: Folio,
  sections: Section[],
  maxChars?: number,
  titleBarColor?: string
) {
  const width = maxChars && maxChars > 0 ? `${maxChars}ch` : '46rem';
  const band = bandColors(titleBarColor || '#4a4a4a');
  const body = renderBody(folio.guion || '', sections);

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(folio.title || 'Folio')}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #ECE3D2; color: #2A2620;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 1.5rem; line-height: 1.55;
  }
  @media (prefers-color-scheme: dark) { body { background: #15161A; color: #E7E5E0; } }
  .wrap {
    max-width: ${width}; margin: 24px auto; padding: 30px 34px 40px;
    background: #FBF7EE; border: 1px solid rgba(120,105,80,.16); border-radius: 8px;
    box-shadow: 0 1px 2px rgba(70,55,30,.05), 0 10px 30px rgba(70,55,30,.07);
  }
  @media (prefers-color-scheme: dark) {
    .wrap { background: #23262C; border-color: rgba(255,255,255,.06); box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.28); }
  }
  h1 {
    font-size: 1.95rem; text-align: center; font-weight: 700; line-height: 1.2;
    background: ${band.lightBg}; color: ${band.lightText};
    padding: .55em .9em; margin: 0 0 1.1em; border-radius: 16px;
  }
  @media (prefers-color-scheme: dark) {
    h1 { background: ${band.darkBg}; color: ${band.darkText}; }
  }
  p { margin: 0 0 .7em; }
  p:empty::before { content: "\\00a0"; }
  hr { border: none; border-top: 2px solid rgba(127,127,127,.4); margin: .9em 0; }
  ul { list-style: disc; padding-left: 1.4em; }
  ol { list-style: decimal; padding-left: 1.4em; }
  li { margin: .15em 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  a.internal-link { color: #4A6B57; text-decoration: underline; text-underline-offset: 2px; cursor: help; }
  @media (prefers-color-scheme: dark) { a.internal-link { color: #89A995; } }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${esc(folio.title || 'Folio')}</h1>
    ${body}
  </div>
</body>
</html>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
