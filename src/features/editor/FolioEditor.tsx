import { ArrowDown, ArrowUp, Eye, Link2, Plus, Trash2 } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextField } from './RichTextField';
import { LinkTargetMenu } from './LinkTargetMenu';
import { resolveTarget } from './linkUtils';
import { openFolioPreview } from './previewFolio';
import { cn } from '@/lib/cn';
import type { Folio } from '@/types';

export function FolioEditor({ folio }: { folio: Folio }) {
  const update = useEditorStore((s) => s.updateFolio);
  const addLink = useEditorStore((s) => s.addLink);
  const updateLink = useEditorStore((s) => s.updateLink);
  const deleteLink = useEditorStore((s) => s.deleteLink);
  const reorderLink = useEditorStore((s) => s.reorderLink);
  const activeProject = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const sections = activeProject?.sections ?? [];
  const maxChars = activeProject?.maxChars;
  const titleBarColor = sections.find((s) => s.folios.some((f) => f.id === folio.id))?.titleBarColor;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 p-4">
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Título del folio</label>
          <Button variant="outline" size="sm" onClick={() => openFolioPreview(folio, sections, maxChars, titleBarColor)}>
            <Eye className="h-4 w-4" /> Vista previa
          </Button>
        </div>
        <Input value={folio.title} onChange={(e) => update(folio.id, { title: e.target.value })} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <label className="text-sm font-medium">Cuerpo</label>
        <RichTextField
          className="min-h-0 flex-1"
          value={folio.guion}
          onChange={(html) => update(folio.id, { guion: html })}
          maxChars={maxChars}
        />
      </div>

      {/* Enlaces */}
      <div className="max-h-[38vh] shrink-0 space-y-2 overflow-y-auto pt-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Enlaces</label>
          <Button variant="outline" size="sm" onClick={() => addLink(folio.id)}>
            <Plus className="h-4 w-4" /> Agregar enlace
          </Button>
        </div>

        <div className="space-y-2">
          {folio.links.map((link, i) => {
            const { label, broken } = resolveTarget(sections, link.target);
            return (
              <div key={link.id} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  placeholder="Texto del botón (ej. Ver Muertes)"
                  onChange={(e) => updateLink(folio.id, link.id, { label: e.target.value })}
                  className="flex-1"
                />
                <LinkTargetMenu
                  onPick={(target) => updateLink(folio.id, link.id, { target })}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('max-w-[15rem] justify-start', broken && 'border-destructive text-destructive')}
                    >
                      <Link2 className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="truncate">{label}</span>
                    </Button>
                  }
                />
                <Button variant="ghost" size="icon-sm" title="Subir" disabled={i === 0} onClick={() => reorderLink(folio.id, i, i - 1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Bajar"
                  disabled={i === folio.links.length - 1}
                  onClick={() => reorderLink(folio.id, i, i + 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Borrar enlace"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deleteLink(folio.id, link.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
