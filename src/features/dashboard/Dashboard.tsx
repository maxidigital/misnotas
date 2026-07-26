import * as React from 'react';
import { Download, FilePlus2, LogOut, MoreVertical, Pencil, Copy, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  listGuides,
  getGuide,
  createGuide,
  updateGuide,
  deleteGuide,
  ApiError,
  type GuideMeta,
} from '@/services/guidesApi';
import { useAuth } from '@/store/useAuth';
import type { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'guia';
}
function fmtDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function Dashboard() {
  const logout = useAuth((s) => s.logout);
  const [guides, setGuides] = React.useState<GuideMeta[] | null>(null);
  const [rename, setRename] = React.useState<GuideMeta | null>(null);
  const [renameVal, setRenameVal] = React.useState('');
  const [del, setDel] = React.useState<GuideMeta | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(() => {
    listGuides()
      .then(setGuides)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) logout();
        else toast.error('No se pudieron cargar las guías');
      });
  }, [logout]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const open = (id: string) => {
    location.hash = '#/g/' + id;
  };

  const onNew = async () => {
    try {
      const p = await createGuide({ name: 'Nueva guía', sections: [] });
      open(p.id);
    } catch {
      toast.error('No se pudo crear');
    }
  };

  const onDuplicate = async (g: GuideMeta) => {
    try {
      const full = await getGuide(g.id);
      const copy: Partial<Project> = { ...full, name: (full.name || 'Guía') + ' (copia)' };
      delete copy.id;
      await createGuide(copy);
      toast.success('Duplicada');
      reload();
    } catch {
      toast.error('No se pudo duplicar');
    }
  };

  const doRename = async () => {
    if (!rename) return;
    try {
      const full = await getGuide(rename.id);
      await updateGuide(rename.id, { ...full, name: renameVal.trim() || full.name });
      setRename(null);
      reload();
    } catch {
      toast.error('No se pudo renombrar');
    }
  };

  const doDelete = async () => {
    if (!del) return;
    try {
      await deleteGuide(del.id);
      setDel(null);
      reload();
    } catch {
      toast.error('No se pudo borrar');
    }
  };

  const onExport = async (g: GuideMeta) => {
    try {
      const full = await getGuide(g.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = slug(full.name) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo exportar');
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.sections)) throw new Error('Formato inválido');
      const copy: Partial<Project> = { ...data };
      delete copy.id;
      await createGuide(copy);
      toast.success('Guía importada');
      reload();
    } catch (err) {
      toast.error('No se pudo importar: ' + (err instanceof Error ? err.message : 'archivo inválido'));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-center gap-3">
        <img src="/blasco.png" alt="" className="h-8 w-8 object-contain dark:invert" />
        <h1 className="flex-1 text-xl font-semibold">Mis guías</h1>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Importar
        </Button>
        <Button size="sm" onClick={onNew}>
          <FilePlus2 className="h-4 w-4" /> Nueva guía
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" title="Salir" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {guides === null ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : guides.length === 0 ? (
        <p className="text-muted-foreground">No hay guías todavía. Creá una con “Nueva guía”.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <div key={g.id} className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50">
              <button className="block w-full text-left" onClick={() => open(g.id)}>
                <div className="mb-6 truncate pr-6 text-base font-semibold">{g.name || '(sin nombre)'}</div>
                <div className="text-xs text-muted-foreground">
                  {g.sections} secciones · {g.folios} folios
                </div>
                <div className="text-xs text-muted-foreground">{fmtDate(g.updatedAt)}</div>
              </button>
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 data-[open=true]:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => { setRename(g); setRenameVal(g.name); }}>
                      <Pencil className="h-4 w-4" /> Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDuplicate(g)}>
                      <Copy className="h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onExport(g)}>
                      <Download className="h-4 w-4" /> Exportar JSON
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => setDel(g)}>
                      <Trash2 className="h-4 w-4" /> Borrar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rename} onOpenChange={(o) => !o && setRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar guía</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doRename()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRename(null)}>Cancelar</Button>
            <Button onClick={doRename}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Borrar “{del?.name}”?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Se elimina la guía y su contenido. No se puede deshacer.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDel(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={doDelete}>Borrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
