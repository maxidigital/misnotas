import * as React from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';
import type { Folio, Section } from '@/types';

export function SectionTree() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const addSection = useEditorStore((s) => s.addSection);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const st = useEditorStore.getState();
    const p = st.projects.find((pp) => pp.id === st.activeProjectId);
    if (!p) return;
    const aid = String(active.id);
    const oid = String(over.id);
    const secIds = p.sections.map((s) => s.id);
    if (secIds.includes(aid)) {
      const to = secIds.indexOf(oid);
      if (to !== -1) st.reorderSections(secIds.indexOf(aid), to);
      return;
    }
    const sec = p.sections.find((s) => s.folios.some((f) => f.id === aid));
    if (!sec) return;
    const ids = sec.folios.map((f) => f.id);
    if (ids.includes(oid)) st.reorderFolios(sec.id, ids.indexOf(aid), ids.indexOf(oid));
  };

  if (!project) {
    return <div className="p-4 text-sm text-muted-foreground">No hay proyecto activo.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secciones</span>
        <Button variant="ghost" size="sm" onClick={() => addSection()}>
          <Plus className="h-4 w-4" /> Sección
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={project.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {project.sections.map((section) => (
              <SortableSection key={section.id} section={section} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SortableSection({ section }: { section: Section }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [collapsed, setCollapsed] = React.useState(true);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const addFolio = useEditorStore((s) => s.addFolio);
  const deleteSection = useEditorStore((s) => s.deleteSection);

  const selected = selection.sectionId === section.id && !selection.folioId;

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg px-2 py-2 transition-colors',
          selected ? 'bg-selected/10 ring-1 ring-inset ring-selected' : 'hover:bg-accent/60'
        )}
      >
        <button
          className="cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expandir' : 'Colapsar'}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <span
            className="truncate text-sm font-medium"
            style={section.titleBarColor ? { color: section.titleBarColor } : undefined}
          >
            {section.name}
          </span>
          {section.type === 'apendice' && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              apéndice
            </span>
          )}
        </button>
        <span className="text-xs text-muted-foreground">{section.folios.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => addFolio(section.id)}>
              <Plus className="h-4 w-4" /> Agregar folio
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => select({ sectionId: section.id })}>
              Editar sección
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => deleteSection(section.id)}>
              <Trash2 className="h-4 w-4" /> Borrar sección
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!collapsed && (
        <div className="ml-5 pl-2">
          <SortableContext items={section.folios.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            {section.folios.map((folio) => (
              <SortableFolio key={folio.id} folio={folio} sectionId={section.id} />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

function SortableFolio({ folio, sectionId }: { folio: Folio; sectionId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folio.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const duplicate = useEditorStore((s) => s.duplicateFolio);
  const remove = useEditorStore((s) => s.deleteFolio);
  const selected = selection.folioId === folio.id;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg px-2 py-0 transition-colors',
          selected ? 'bg-selected/10 font-medium text-foreground ring-1 ring-inset ring-selected' : 'hover:bg-accent/60'
        )}
      >
        <button
          className="cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button className="min-w-0 flex-1 truncate py-0.5 text-left text-sm" onClick={() => select({ sectionId, folioId: folio.id })}>
          {folio.title || <span className="text-muted-foreground">(sin título)</span>}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => duplicate(folio.id)}>
              <Copy className="h-4 w-4" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => remove(folio.id)}>
              <Trash2 className="h-4 w-4" /> Borrar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
