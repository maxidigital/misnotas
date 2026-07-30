import * as React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { listPublications, updatePublication } from '@/services/guidesApi';
import { renderGuideHtml } from './buildGuide';

export function PublishButton() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const onConfirm = async () => {
    if (!project) return;
    setBusy(true);
    try {
      const pubs = await listPublications();
      const linked = pubs.filter((p) => p.guideId === project.id);
      if (linked.length === 0) {
        toast('Esta guía no tiene publicaciones');
        setOpen(false);
        return;
      }
      const html = renderGuideHtml(project);
      const name = project.name || '';
      await Promise.all(linked.map((p) => updatePublication(p.slug, { guideId: project.id, guideName: name, html })));
      toast.success(linked.length === 1 ? 'Publicación actualizada' : linked.length + ' publicaciones actualizadas');
      setOpen(false);
    } catch {
      toast.error('No se pudo actualizar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} title="Actualizar las publicaciones de esta guía">
        <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Actualizar</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Actualizar la guía publicada?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
