import { ArrowLeft } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SaveIndicator } from '@/components/layout/SaveIndicator';
import { BuildButton } from '@/features/editor/BuildButton';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const name = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId)?.name);
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <Button variant="ghost" size="sm" onClick={() => (location.hash = '#/')}>
        <ArrowLeft className="h-4 w-4" /> Mis guías
      </Button>
      <img src="/blasco.png" alt="" className="h-6 w-6 object-contain dark:invert" />
      <span className="truncate font-semibold">{name || 'misnotas'}</span>
      <div className="flex-1" />
      <SaveIndicator />
      <div className="mx-1 h-6 w-px bg-border" />
      <BuildButton />
      <ThemeToggle />
    </header>
  );
}
