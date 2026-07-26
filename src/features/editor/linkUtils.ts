import type { LinkTarget, Section } from '@/types';

/** Resolves a link target to a human label, flagging broken (deleted) targets. */
export function resolveTarget(sections: Section[], target: LinkTarget): { label: string; broken: boolean } {
  if (!target || !target.id) return { label: 'Elegir destino…', broken: false };
  if (target.kind === 'section') {
    const s = sections.find((x) => x.id === target.id);
    return s ? { label: `Sección · ${s.name}`, broken: false } : { label: '(destino eliminado)', broken: true };
  }
  for (const s of sections) {
    const f = s.folios.find((x) => x.id === target.id);
    if (f) return { label: `Folio · ${f.title || '(sin título)'}`, broken: false };
  }
  return { label: '(destino eliminado)', broken: true };
}
