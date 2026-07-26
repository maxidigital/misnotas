import type { Folio, Section } from '@/types';
import { resolveTarget } from './linkUtils';

export function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Pastel band colors (light + dark) derived from a base hex. Shared by preview and build. */
export function bandColors(hex: string) {
  const { h, s } = hexToHsl(hex || '#4a4a4a');
  const sBg = clamp(s, 16, 40);
  return {
    lightBg: `hsl(${h} ${sBg}% 88%)`,
    lightText: `hsl(${h} ${clamp(s, 38, 78)}% 32%)`,
    darkBg: `hsl(${h} ${sBg}% 22%)`,
    darkText: `hsl(${h} ${clamp(s, 34, 74)}% 80%)`,
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
    margin: 0; background: #EFE8DA; color: #2A2620;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 1.5rem; line-height: 1.55;
  }
  @media (prefers-color-scheme: dark) { body { background: #17181C; color: #E7E5E0; } }
  .wrap {
    max-width: ${width}; margin: 0 auto; padding: 40px 32px 96px; min-height: 100vh;
    background: #FFFDFC;
  }
  @media (prefers-color-scheme: dark) { .wrap { background: #262930; } }
  h1 {
    font-size: 2.1rem; text-align: center; font-weight: 700;
    background: ${band.lightBg}; color: ${band.lightText};
    padding: .12em .8em; margin: 0 5% 1em;
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
