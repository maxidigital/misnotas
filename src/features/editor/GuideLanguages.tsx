import { Check, Languages } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LANGUAGE_CATALOG } from '@/lib/languages';

/** Which languages this guide's published reader offers, besides Spanish (always on).
 *  A checklist popover (not a fixed row of buttons) so it holds up as the catalog grows. */
export function GuideLanguages() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const updateLanguages = useEditorStore((s) => s.updateProjectLanguages);
  if (!project) return null;

  const enabled = new Set(project.languages?.length ? project.languages : ['es']);

  const toggle = (code: string) => {
    const next = new Set(enabled);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    next.add('es');
    updateLanguages(LANGUAGE_CATALOG.filter((l) => next.has(l.code)).map((l) => l.code));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Idiomas de esta guía">
          <Languages className="h-4 w-4" /> <span className="hidden sm:inline">Idiomas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Idiomas de esta guía</DropdownMenuLabel>
        {LANGUAGE_CATALOG.map((l) => (
          <DropdownMenuItem
            key={l.code}
            disabled={l.code === 'es'}
            onSelect={(e) => {
              e.preventDefault();
              if (l.code !== 'es') toggle(l.code);
            }}
          >
            <Check className={enabled.has(l.code) ? 'h-4 w-4 opacity-100' : 'h-4 w-4 opacity-0'} />
            {l.nativeName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
