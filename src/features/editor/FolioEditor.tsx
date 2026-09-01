import { ArrowDown, ArrowUp, Eye, Link2, Plus, Trash2 } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextField } from './RichTextField';
import { LinkTargetMenu } from './LinkTargetMenu';
import { LangTabs } from './LangTabs';
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
  const editingLang = useEditorStore((s) => s.editingLang);
  const activeProject = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const sections = activeProject?.sections ?? [];
  const languages = activeProject?.languages?.length ? activeProject.languages : ['es'];
  const maxChars = activeProject?.maxChars;
  const titleBarColor = sections.find((s) => s.folios.some((f) => f.id === folio.id))?.titleBarColor;

  const lang = languages.includes(editingLang) ? editingLang : 'es';
  const isTranslating = lang !== 'es';
  const title = isTranslating ? folio.titleI18n?.[lang] || '' : folio.title;
  const guion = isTranslating ? folio.guionI18n?.[lang] || '' : folio.guion;
  const copyFromSpanish = () => update(folio.id, { title: folio.title, guion: folio.guion }, lang);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-5 p-4 sm:p-6 md:p-8">
      <LangTabs languages={languages} />

      {isTranslating && !title && !guion && (
        <Button variant="outline" size="sm" className="w-fit shrink-0" onClick={copyFromSpanish}>
          Copiar del español
        </Button>
      )}

      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Título del folio</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openFolioPreview(folio, sections, maxChars, titleBarColor, lang)}
          >
            <Eye className="h-4 w-4" /> Vista previa
          </Button>
        </div>
        <Input
          value={title}
          onChange={(e) => update(folio.id, { title: e.target.value }, lang)}
          placeholder={isTranslating ? folio.title : undefined}
          className="h-10 text-base"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cuerpo</label>
        <RichTextField
          key={`${folio.id}:${lang}`}
          className="min-h-0 flex-1"
          value={guion}
          onChange={(html) => update(folio.id, { guion: html }, lang)}
          maxChars={maxChars}
        />
      </div>

      {/* Enlaces */}
      <div className="max-h-[38vh] shrink-0 space-y-3 overflow-y-auto border-t border-border/50 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enlaces</label>
          <Button variant="ghost" size="sm" onClick={() => addLink(folio.id)}>
            <Plus className="h-4 w-4" /> Agregar enlace
          </Button>
        </div>

        <div className="space-y-2">
          {folio.links.map((link, i) => {
            const { label, broken } = resolveTarget(sections, link.target);
            const linkLabel = isTranslating ? link.labelI18n?.[lang] || '' : link.label;
            return (
              <div key={link.id} className="flex flex-wrap items-center gap-2">
                <Input
                  value={linkLabel}
                  placeholder={isTranslating ? link.label : 'Texto del botón (ej. Ver Muertes)'}
                  onChange={(e) => updateLink(folio.id, link.id, { label: e.target.value }, lang)}
                  className="min-w-[7rem] flex-1"
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
