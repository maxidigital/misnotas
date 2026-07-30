import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft, FileText } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { SectionTree } from './SectionTree';
import { FolioEditor } from './FolioEditor';
import { SectionEditor } from './SectionEditor';
import { FolioTabs } from './FolioTabs';

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      <FileText className="h-8 w-8 opacity-50" />
      <p className="max-w-xs text-sm">{text}</p>
    </div>
  );
}

export function EditorWorkspace() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const folio = project && selection.folioId
    ? project.sections.flatMap((s) => s.folios).find((f) => f.id === selection.folioId)
    : undefined;
  const section = project && selection.sectionId
    ? project.sections.find((s) => s.id === selection.sectionId)
    : undefined;
  const hasSelection = !!folio || !!section;

  const content = !project ? (
    <EmptyState text="Creá o importá un proyecto para empezar." />
  ) : folio ? (
    <FolioEditor key={folio.id} folio={folio} />
  ) : section ? (
    <SectionEditor key={section.id} section={section} />
  ) : (
    <EmptyState text="Seleccioná un folio o una sección a la izquierda para editarlo." />
  );

  // Mobile: una sola columna. Sin selección → árbol; con selección → editor + volver.
  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {hasSelection ? (
          <div className="flex min-h-0 flex-1 flex-col bg-card">
            <div className="flex shrink-0 items-center border-b border-border px-1 py-1">
              <Button variant="ghost" size="sm" onClick={() => select({})}>
                <ArrowLeft className="h-4 w-4" /> Secciones
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted">
            <SectionTree />
          </div>
        )}
      </div>
    );
  }

  return (
    <PanelGroup direction="horizontal" autoSaveId="guide.editor.panels" className="min-h-0 flex-1">
      <Panel defaultSize={30} minSize={22} className="border-r border-border bg-muted">
        <SectionTree />
      </Panel>
      <PanelResizeHandle className="w-px bg-border/60 transition-colors hover:bg-primary/40 data-[resize-handle-state=drag]:bg-primary/60" />
      <Panel minSize={40} className="flex min-h-0 flex-col bg-card">
        <FolioTabs />
        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      </Panel>
    </PanelGroup>
  );
}
