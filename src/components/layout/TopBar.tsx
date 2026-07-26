import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SaveIndicator } from '@/components/layout/SaveIndicator';
import { ProjectMenu } from '@/features/editor/ProjectMenu';
import { ImportExport } from '@/features/editor/ImportExport';
import { BuildButton } from '@/features/editor/BuildButton';

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <div className="flex items-center gap-2 font-semibold">
        <img src="/blasco.png" alt="Instituto Blasco" className="h-7 w-7 object-contain dark:invert" />
        <span className="hidden sm:inline">misnotas</span>
      </div>
      <div className="mx-1 h-6 w-px bg-border" />
      <ProjectMenu />
      <div className="flex-1" />
      <SaveIndicator />
      <div className="mx-1 h-6 w-px bg-border" />
      <ImportExport />
      <BuildButton />
      <ThemeToggle />
    </header>
  );
}
