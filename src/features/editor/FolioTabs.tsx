import { X } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { cn } from '@/lib/cn';

/** Tabs bar of open folios (accumulate as you open folios; click to switch, ✕ to close). */
export function FolioTabs() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const openFolioIds = useEditorStore((s) => s.openFolioIds);
  const activeFolioId = useEditorStore((s) => s.selection.folioId);
  const select = useEditorStore((s) => s.select);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (!project) return null;

  const tabs = openFolioIds
    .map((id) => {
      for (const sec of project.sections) {
        const f = sec.folios.find((x) => x.id === id);
        if (f) return { id, title: f.title, sectionId: sec.id };
      }
      return null;
    })
    .filter((t): t is { id: string; title: string; sectionId: string } => t !== null);

  if (tabs.length === 0) return null;

  return (
    <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-border/60 bg-muted/30">
      {tabs.map((t) => {
        const active = t.id === activeFolioId;
        return (
          <div
            key={t.id}
            onClick={() => select({ sectionId: t.sectionId, folioId: t.id })}
            className={cn(
              'group flex max-w-[15rem] shrink-0 cursor-pointer items-center gap-1.5 border-r border-border/40 border-t-2 px-3.5 py-2 text-sm transition-colors',
              active
                ? 'border-t-primary bg-background font-medium text-foreground'
                : 'border-t-transparent text-muted-foreground hover:bg-background/60'
            )}
          >
            <span className="truncate">{t.title || '(sin título)'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
              title="Cerrar"
              className="rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
