import * as React from 'react';
import {
  ChevronRight,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Folder as FolderIcon,
  FolderInput,
  FolderPlus,
  Home,
  LogOut,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listGuides,
  listFolders,
  getGuide,
  createGuide,
  patchGuide,
  deleteGuide,
  createFolder,
  updateFolder,
  deleteFolder,
  ApiError,
  type GuideMeta,
  type Folder,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
function flatten(folders: Folder[], parentId: string | null = null, depth = 0): { f: Folder; depth: number }[] {
  return folders
    .filter((f) => (f.parentId || null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((f) => [{ f, depth }, ...flatten(folders, f.id, depth + 1)]);
}
function descendants(folders: Folder[], id: string): Set<string> {
  const set = new Set<string>([id]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentId && set.has(f.parentId) && !set.has(f.id)) {
        set.add(f.id);
        added = true;
      }
    }
  }
  return set;
}
function pathTo(folders: Folder[], id: string | null): Folder[] {
  const chain: Folder[] = [];
  let cur = id;
  while (cur) {
    const f = folders.find((x) => x.id === cur);
    if (!f) break;
    chain.unshift(f);
    cur = f.parentId;
  }
  return chain;
}

type Item = { kind: 'guide' | 'folder'; id: string; name: string };

export function Dashboard() {
  const logout = useAuth((s) => s.logout);
  const [guides, setGuides] = React.useState<GuideMeta[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [cwd, setCwd] = React.useState<string | null>(null);
  const [rename, setRename] = React.useState<Item | null>(null);
  const [renameVal, setRenameVal] = React.useState('');
  const [del, setDel] = React.useState<Item | null>(null);
  const [newFolder, setNewFolder] = React.useState(false);
  const [folderName, setFolderName] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(() => {
    Promise.all([listGuides(), listFolders()])
      .then(([g, f]) => {
        setGuides(g);
        setFolders(f);
        setLoaded(true);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) logout();
        else toast.error('No se pudo cargar');
      });
  }, [logout]);

  React.useEffect(() => reload(), [reload]);

  const subfolders = flatten(folders, cwd, 0).filter(({ f }) => (f.parentId || null) === cwd);
  const items = guides.filter((g) => (g.folderId || null) === cwd);
  const crumbs = pathTo(folders, cwd);
  const allFolders = flatten(folders);

  const openGuide = (id: string) => (location.hash = '#/g/' + id);

  const onNewGuide = async () => {
    try {
      const p = await createGuide({ name: 'Nueva guía', sections: [], folderId: cwd });
      openGuide(p.id);
    } catch {
      toast.error('No se pudo crear');
    }
  };
  const onNewFolder = async () => {
    try {
      await createFolder(folderName.trim() || 'Carpeta', cwd);
      setNewFolder(false);
      setFolderName('');
      reload();
    } catch {
      toast.error('No se pudo crear la carpeta');
    }
  };
  const onDuplicate = async (id: string) => {
    try {
      const full = await getGuide(id);
      const copy: Partial<Project> = { ...full, name: (full.name || 'Guía') + ' (copia)', folderId: cwd };
      delete copy.id;
      await createGuide(copy);
      toast.success('Duplicada');
      reload();
    } catch {
      toast.error('No se pudo duplicar');
    }
  };
  const onExport = async (id: string) => {
    try {
      const full = await getGuide(id);
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
      const copy: Partial<Project> = { ...data, folderId: cwd };
      delete copy.id;
      await createGuide(copy);
      toast.success('Guía importada');
      reload();
    } catch (err) {
      toast.error('No se pudo importar: ' + (err instanceof Error ? err.message : 'archivo inválido'));
    }
  };
  const doRename = async () => {
    if (!rename) return;
    try {
      if (rename.kind === 'guide') await patchGuide(rename.id, { name: renameVal.trim() || rename.name });
      else await updateFolder(rename.id, { name: renameVal.trim() || rename.name });
      setRename(null);
      reload();
    } catch {
      toast.error('No se pudo renombrar');
    }
  };
  const doDelete = async () => {
    if (!del) return;
    try {
      if (del.kind === 'guide') await deleteGuide(del.id);
      else await deleteFolder(del.id);
      setDel(null);
      reload();
    } catch {
      toast.error('No se pudo borrar');
    }
  };
  const move = async (item: Item, target: string | null) => {
    try {
      if (item.kind === 'guide') await patchGuide(item.id, { folderId: target });
      else await updateFolder(item.id, { parentId: target });
      reload();
    } catch {
      toast.error('No se pudo mover');
    }
  };

  const MoveMenu = ({ item }: { item: Item }) => {
    const blocked = item.kind === 'folder' ? descendants(folders, item.id) : new Set<string>();
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <FolderInput className="h-4 w-4" /> Mover a…
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onSelect={() => move(item, null)}>
            <Home className="h-4 w-4" /> Inicio (raíz)
          </DropdownMenuItem>
          {allFolders.length > 0 && <DropdownMenuSeparator />}
          {allFolders.map(({ f, depth }) => (
            <DropdownMenuItem key={f.id} disabled={blocked.has(f.id)} onSelect={() => move(item, f.id)}>
              <span style={{ paddingLeft: depth * 12 }} className="flex items-center gap-2 truncate">
                <FolderIcon className="h-4 w-4 opacity-70" /> {f.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <img src="/blasco.png" alt="" className="h-7 w-7 object-contain dark:invert" />
        <span className="font-semibold">misnotas</span>
        <div className="flex-1" />
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        <Button variant="ghost" size="sm" onClick={() => setNewFolder(true)}>
          <FolderPlus className="h-4 w-4" /> Carpeta
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Importar
        </Button>
        <Button size="sm" onClick={onNewGuide}>
          <FilePlus2 className="h-4 w-4" /> Nueva guía
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" title="Salir" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-6 py-3 text-sm text-muted-foreground">
        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setCwd(null)}>
          <Home className="h-4 w-4" /> Mis guías
        </button>
        {crumbs.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button className="hover:text-foreground" onClick={() => setCwd(f.id)}>
              {f.name}
            </button>
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10">
        {!loaded ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : subfolders.length === 0 && items.length === 0 ? (
          <p className="text-muted-foreground">Carpeta vacía. Creá una guía o una carpeta.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subfolders.map(({ f }) => (
              <div key={f.id} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/50">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setCwd(f.id)}>
                  <FolderIcon className="h-6 w-6 shrink-0 text-primary" />
                  <span className="truncate pr-6 font-medium">{f.name}</span>
                </button>
                <ItemMenu item={{ kind: 'folder', id: f.id, name: f.name }} />
              </div>
            ))}
            {items.map((g) => (
              <div key={g.id} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/50">
                <button className="block w-full text-left" onClick={() => openGuide(g.id)}>
                  <div className="mb-6 flex items-start gap-2 pr-6">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-semibold">{g.name || '(sin nombre)'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.sections} secciones · {g.folios} folios
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(g.updatedAt)}</div>
                </button>
                <ItemMenu item={{ kind: 'guide', id: g.id, name: g.name }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={!!rename} onOpenChange={(o) => !o && setRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar {rename?.kind === 'folder' ? 'carpeta' : 'guía'}</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRename(null)}>Cancelar</Button>
            <Button onClick={doRename}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolder} onOpenChange={(o) => !o && setNewFolder(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
          </DialogHeader>
          <Input autoFocus placeholder="Nombre" value={folderName} onChange={(e) => setFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onNewFolder()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolder(false)}>Cancelar</Button>
            <Button onClick={onNewFolder}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Borrar “{del?.name}”?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {del?.kind === 'folder'
              ? 'Se borra la carpeta; su contenido pasa a la carpeta padre.'
              : 'Se elimina la guía y su contenido. No se puede deshacer.'}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDel(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={doDelete}>Borrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function ItemMenu({ item }: { item: Item }) {
    return (
      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setRename(item); setRenameVal(item.name); }}>
              <Pencil className="h-4 w-4" /> Renombrar
            </DropdownMenuItem>
            {item.kind === 'guide' && (
              <>
                <DropdownMenuItem onSelect={() => onDuplicate(item.id)}>
                  <Copy className="h-4 w-4" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onExport(item.id)}>
                  <Download className="h-4 w-4" /> Exportar JSON
                </DropdownMenuItem>
              </>
            )}
            <MoveMenu item={item} />
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setDel(item)}>
              <Trash2 className="h-4 w-4" /> Borrar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
}
