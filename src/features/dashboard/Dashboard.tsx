import * as React from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
  Library,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

/* ---------- helpers ---------- */
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

export type Item = { kind: 'guide' | 'folder'; id: string; name: string };

/* Data-driven menu, rendered by both the ⋮ dropdown and the right-click context menu. */
type MenuNode =
  | { type: 'item'; label: React.ReactNode; icon?: React.ReactNode; destructive?: boolean; disabled?: boolean; onSelect: () => void }
  | { type: 'sep' }
  | { type: 'sub'; label: React.ReactNode; icon?: React.ReactNode; children: MenuNode[] };

function DropdownNodes({ nodes }: { nodes: MenuNode[] }) {
  return (
    <>
      {nodes.map((n, i) =>
        n.type === 'sep' ? (
          <DropdownMenuSeparator key={i} />
        ) : n.type === 'sub' ? (
          <DropdownMenuSub key={i}>
            <DropdownMenuSubTrigger>
              {n.icon}
              {n.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownNodes nodes={n.children} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem key={i} destructive={n.destructive} disabled={n.disabled} onSelect={n.onSelect}>
            {n.icon}
            {n.label}
          </DropdownMenuItem>
        )
      )}
    </>
  );
}
function ContextNodes({ nodes }: { nodes: MenuNode[] }) {
  return (
    <>
      {nodes.map((n, i) =>
        n.type === 'sep' ? (
          <ContextMenuSeparator key={i} />
        ) : n.type === 'sub' ? (
          <ContextMenuSub key={i}>
            <ContextMenuSubTrigger>
              {n.icon}
              {n.label}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextNodes nodes={n.children} />
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : (
          <ContextMenuItem
            key={i}
            disabled={n.disabled}
            onSelect={n.onSelect}
            className={n.destructive ? 'text-destructive focus:bg-destructive/10 focus:text-destructive' : undefined}
          >
            {n.icon}
            {n.label}
          </ContextMenuItem>
        )
      )}
    </>
  );
}

function Kebab({ nodes }: { nodes: MenuNode[] }) {
  return (
    <div className="absolute right-2 top-2" onPointerDown={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownNodes nodes={nodes} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const cardCls = (over: boolean) =>
  cn(
    'group relative rounded-xl border border-border/70 bg-card p-5 shadow-card transition-all duration-150',
    over ? 'border-primary/60 ring-2 ring-primary/30' : 'hover:border-border hover:shadow-md'
  );

function FolderCard({ f, onOpen, nodes }: { f: Folder; onOpen: () => void; nodes: MenuNode[] }) {
  const drag = useDraggable({ id: 'drag-' + f.id, data: { kind: 'folder', id: f.id, name: f.name } });
  const drop = useDroppable({ id: 'drop-' + f.id, data: { folderId: f.id } });
  const ref = (node: HTMLElement | null) => {
    drag.setNodeRef(node);
    drop.setNodeRef(node);
  };
  const style = { transform: CSS.Translate.toString(drag.transform), opacity: drag.isDragging ? 0.4 : 1 };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={ref} style={style} {...drag.attributes} {...drag.listeners} className={cardCls(drop.isOver)}>
          <button className="flex w-full items-center gap-3 text-left" onClick={onOpen}>
            <FolderIcon className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate pr-6 font-medium">{f.name}</span>
          </button>
          <Kebab nodes={nodes} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextNodes nodes={nodes} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function GuideCard({ g, onOpen, nodes }: { g: GuideMeta; onOpen: () => void; nodes: MenuNode[] }) {
  const drag = useDraggable({ id: 'drag-' + g.id, data: { kind: 'guide', id: g.id, name: g.name } });
  const style = { transform: CSS.Translate.toString(drag.transform), opacity: drag.isDragging ? 0.4 : 1 };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={drag.setNodeRef} style={style} {...drag.attributes} {...drag.listeners} className={cardCls(false)}>
          <button className="block w-full text-left" onClick={onOpen}>
            <div className="mb-6 flex items-start gap-2 pr-6">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="truncate font-semibold">{g.name || '(sin nombre)'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {g.sections} secciones · {g.folios} folios
            </div>
            <div className="text-xs text-muted-foreground">{fmtDate(g.updatedAt)}</div>
          </button>
          <Kebab nodes={nodes} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextNodes nodes={nodes} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function DropZone({ id, folderId, className, children }: { id: string; folderId: string | null; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { folderId } });
  return (
    <span ref={setNodeRef} className={cn(className, isOver && 'rounded bg-primary/15 text-foreground')}>
      {children}
    </span>
  );
}

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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const subfolders = folders.filter((f) => (f.parentId || null) === cwd).sort((a, b) => a.name.localeCompare(b.name));
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
    if (item.kind === 'folder' && (target === item.id || descendants(folders, item.id).has(target || ''))) return;
    if ((item.kind === 'guide' && (guides.find((g) => g.id === item.id)?.folderId || null) === target) ||
        (item.kind === 'folder' && (folders.find((f) => f.id === item.id)?.parentId || null) === target)) {
      return; // ya está ahí
    }
    try {
      if (item.kind === 'guide') await patchGuide(item.id, { folderId: target });
      else await updateFolder(item.id, { parentId: target });
      reload();
    } catch {
      toast.error('No se pudo mover');
    }
  };

  const itemNodes = (item: Item): MenuNode[] => {
    const blocked = item.kind === 'folder' ? descendants(folders, item.id) : new Set<string>();
    const moveChildren: MenuNode[] = [
      { type: 'item', label: 'Inicio (raíz)', icon: <Home className="h-4 w-4" />, onSelect: () => move(item, null) },
      ...(allFolders.length ? [{ type: 'sep' } as MenuNode] : []),
      ...allFolders.map(
        ({ f, depth }): MenuNode => ({
          type: 'item',
          disabled: blocked.has(f.id),
          label: (
            <span style={{ paddingLeft: depth * 12 }} className="flex items-center gap-2 truncate">
              <FolderIcon className="h-4 w-4 opacity-70" /> {f.name}
            </span>
          ),
          onSelect: () => move(item, f.id),
        })
      ),
    ];
    return [
      { type: 'item', label: 'Renombrar', icon: <Pencil className="h-4 w-4" />, onSelect: () => { setRename(item); setRenameVal(item.name); } },
      ...(item.kind === 'guide'
        ? ([
            { type: 'item', label: 'Duplicar', icon: <Copy className="h-4 w-4" />, onSelect: () => onDuplicate(item.id) },
            { type: 'item', label: 'Exportar JSON', icon: <Download className="h-4 w-4" />, onSelect: () => onExport(item.id) },
          ] as MenuNode[])
        : []),
      { type: 'sub', label: 'Mover a…', icon: <FolderInput className="h-4 w-4" />, children: moveChildren },
      { type: 'sep' },
      { type: 'item', label: 'Borrar', icon: <Trash2 className="h-4 w-4" />, destructive: true, onSelect: () => setDel(item) },
    ];
  };

  const onDragEnd = (e: DragEndEvent) => {
    const active = e.active.data.current as Item | undefined;
    const target = e.over?.data.current as { folderId: string | null } | undefined;
    if (!active || !target) return;
    move(active, target.folderId);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex h-full">
        {/* Sidebar de navegación */}
        <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <img src="/blasco.png" alt="" className="h-7 w-7 object-contain [filter:invert(1)]" />
            <span className="text-lg font-semibold tracking-tight">Instituto Blasco</span>
          </div>
          <nav className="px-3">
            <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium">
              <Library className="h-[18px] w-[18px]" /> Guías
            </div>
          </nav>
          <div className="flex-1" />
          <div className="border-t border-white/10 p-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <LogOut className="h-[18px] w-[18px]" /> Salir
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 px-8 py-5">
            {/* Breadcrumb (también drop targets) */}
            <nav className="flex flex-1 items-center gap-1 text-sm text-foreground/70">
              <DropZone id="crumb-root" folderId={null} className="px-1">
                <button className="flex items-center gap-1.5 font-medium hover:text-foreground" onClick={() => setCwd(null)}>
                  <Home className="h-4 w-4" /> Mis guías
                </button>
              </DropZone>
              {crumbs.map((f) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 opacity-50" />
                  <DropZone id={'crumb-' + f.id} folderId={f.id} className="px-1">
                    <button className="font-medium hover:text-foreground" onClick={() => setCwd(f.id)}>
                      {f.name}
                    </button>
                  </DropZone>
                </span>
              ))}
            </nav>
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
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
            {!loaded ? (
              <p className="text-foreground/70">Cargando…</p>
            ) : subfolders.length === 0 && items.length === 0 ? (
              <p className="text-foreground/70">Carpeta vacía. Creá una guía o una carpeta.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {subfolders.map((f) => (
                  <FolderCard key={f.id} f={f} onOpen={() => setCwd(f.id)} nodes={itemNodes({ kind: 'folder', id: f.id, name: f.name })} />
                ))}
                {items.map((g) => (
                  <GuideCard key={g.id} g={g} onOpen={() => openGuide(g.id)} nodes={itemNodes({ kind: 'guide', id: g.id, name: g.name })} />
                ))}
              </div>
            )}
          </div>
        </div>
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
    </DndContext>
  );
}
