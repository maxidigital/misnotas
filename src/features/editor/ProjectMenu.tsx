import * as React from 'react';
import { Check, ChevronDown, FolderPlus, Pencil, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DialogMode = null | 'new' | 'rename' | 'delete' | 'settings';

export function ProjectMenu() {
  const projects = useEditorStore((s) => s.projects);
  const activeId = useEditorStore((s) => s.activeProjectId);
  const active = projects.find((p) => p.id === activeId);

  const setActive = useEditorStore((s) => s.setActiveProject);
  const create = useEditorStore((s) => s.createProject);
  const rename = useEditorStore((s) => s.renameProject);
  const remove = useEditorStore((s) => s.deleteProject);
  const setMaxChars = useEditorStore((s) => s.setMaxChars);

  const [mode, setMode] = React.useState<DialogMode>(null);
  const [name, setName] = React.useState('');
  const [chars, setChars] = React.useState(0);

  const openNew = () => { setName(''); setMode('new'); };
  const openRename = () => { setName(active?.name ?? ''); setMode('rename'); };
  const openDelete = () => setMode('delete');
  const openSettings = () => {
    setChars(active?.maxChars ?? 0);
    setMode('settings');
  };
  const saveSettings = () => {
    setMaxChars(chars);
    setMode(null);
    toast.success('Ajustes guardados');
  };

  const submit = () => {
    if (mode === 'new') {
      create(name);
      toast.success('Proyecto creado');
    } else if (mode === 'rename' && active) {
      rename(active.id, name);
      toast.success('Proyecto renombrado');
    }
    setMode(null);
  };
  const confirmDelete = () => {
    if (active) {
      remove(active.id);
      toast.success('Proyecto borrado');
    }
    setMode(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[16rem]">
            <span className="truncate">{active ? active.name : 'Sin proyecto'}</span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[15rem]">
          <DropdownMenuLabel>Proyectos</DropdownMenuLabel>
          {projects.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => setActive(p.id)}>
              <Check className={p.id === activeId ? 'h-4 w-4' : 'h-4 w-4 opacity-0'} />
              <span className="truncate">{p.name}</span>
            </DropdownMenuItem>
          ))}
          {projects.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">Ninguno</div>}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={openNew}>
            <FolderPlus className="h-4 w-4" /> Nuevo proyecto…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openRename} disabled={!active}>
            <Pencil className="h-4 w-4" /> Renombrar…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openSettings} disabled={!active}>
            <Settings className="h-4 w-4" /> Ajustes…
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={openDelete} disabled={!active}>
            <Trash2 className="h-4 w-4" /> Borrar proyecto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={mode === 'new' || mode === 'rename'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'new' ? 'Nuevo proyecto' : 'Renombrar proyecto'}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            placeholder="Nombre del proyecto"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancelar</Button>
            <Button onClick={submit}>{mode === 'new' ? 'Crear' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'settings'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustes del proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ancho máximo (caracteres)</label>
            <Input
              type="number"
              min={0}
              value={chars}
              onChange={(e) => setChars(Number(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && saveSettings()}
            />
            <p className="text-xs text-muted-foreground">0 = sin límite.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancelar</Button>
            <Button onClick={saveSettings}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'delete'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Borrar “{active?.name}”?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará el proyecto y todo su contenido. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Borrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
