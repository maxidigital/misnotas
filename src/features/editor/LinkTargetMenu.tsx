import * as React from 'react';
import { CornerDownRight } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LinkTarget } from '@/types';

interface Props {
  trigger: React.ReactNode;
  onPick: (target: LinkTarget) => void;
}

/** Cascading picker: top level = secciones; each opens a submenu with its folios. */
export function LinkTargetMenu({ trigger, onPick }: Props) {
  const sections = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId)?.sections ?? []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] overflow-y-auto">
        {sections.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin secciones</div>}
        {sections.map((sec) => (
          <DropdownMenuSub key={sec.id}>
            <DropdownMenuSubTrigger>{sec.name}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => onPick({ kind: 'section', id: sec.id })}>
                <CornerDownRight className="h-4 w-4 opacity-70" /> Ir a esta sección (portada)
              </DropdownMenuItem>
              {sec.folios.length > 0 && <DropdownMenuSeparator />}
              {sec.folios.map((f) => (
                <DropdownMenuItem key={f.id} onSelect={() => onPick({ kind: 'folio', id: f.id })}>
                  <span className="truncate">{f.title || '(sin título)'}</span>
                </DropdownMenuItem>
              ))}
              {sec.folios.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin folios</div>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
