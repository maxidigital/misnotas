import { useEditorStore } from '@/store/useEditorStore';
import { languageName } from '@/lib/languages';
import { cn } from '@/lib/cn';
import type { LangCode } from '@/types';

/** Language tab strip for the editor (folio/section fields). Scrolls horizontally instead
 *  of wrapping, so it holds up if the guide's language list grows past a handful. */
export function LangTabs({ languages }: { languages: LangCode[] }) {
  const editingLang = useEditorStore((s) => s.editingLang);
  const setEditingLang = useEditorStore((s) => s.setEditingLang);
  if (languages.length <= 1) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {languages.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setEditingLang(lang)}
          className={cn(
            'shrink-0 rounded-full border-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
            editingLang === lang
              ? 'border-selected bg-selected/10 text-foreground'
              : 'border-border text-muted-foreground hover:bg-accent'
          )}
        >
          {lang === 'es' ? 'ES' : languageName(lang)}
        </button>
      ))}
    </div>
  );
}
