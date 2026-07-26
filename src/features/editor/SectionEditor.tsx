import { useEditorStore } from '@/store/useEditorStore';
import { Input } from '@/components/ui/input';
import { PALETTE } from '@/lib/palette';
import { cn } from '@/lib/cn';
import type { Section, SectionType } from '@/types';

const TYPES: { value: SectionType; label: string }[] = [
  { value: 'flujo', label: 'Flujo' },
  { value: 'apendice', label: 'Apéndice / referencia' },
];

export function SectionEditor({ section }: { section: Section }) {
  const update = useEditorStore((s) => s.updateSection);
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nombre de la sección</label>
        <Input value={section.name} onChange={(e) => update(section.id, { name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tipo</label>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update(section.id, { type: t.value })}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                section.type === t.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input hover:bg-accent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Color de la franja del título</label>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => {
            const selected = (section.titleBarColor ?? '').toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => update(section.id, { titleBarColor: c.value })}
                className={cn(
                  'h-8 w-8 rounded-full border border-black/10 transition-transform hover:scale-110',
                  selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                )}
                style={{ background: c.value }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
