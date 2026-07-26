import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileText } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
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

  const folio = project && selection.folioId
    ? project.sections.flatMap((s) => s.folios).find((f) => f.id === selection.folioId)
    : undefined;
  const section = project && selection.sectionId
    ? project.sections.find((s) => s.id === selection.sectionId)
    : undefined;

  return (
    <PanelGroup direction="horizontal" autoSaveId="guide.editor.panels" className="min-h-0 flex-1">
      <Panel defaultSize={32} minSize={22} className="border-r border-border">
        <SectionTree />
      </Panel>
      <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary/40 data-[resize-handle-state=drag]:bg-primary" />
      <Panel minSize={40} className="flex min-h-0 flex-col">
        <FolioTabs />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!project ? (
            <EmptyState text="Creá o importá un proyecto para empezar." />
          ) : folio ? (
            <FolioEditor key={folio.id} folio={folio} />
          ) : section ? (
            <SectionEditor key={section.id} section={section} />
          ) : (
            <EmptyState text="Seleccioná un folio o una sección a la izquierda para editarlo." />
          )}
        </div>
      </Panel>
    </PanelGroup>
  );
}
