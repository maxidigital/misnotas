import * as React from 'react';
import { Globe, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  getPublishStatus,
  publishGuide,
  unpublishGuide,
  publicUrl,
  type PublishStatus,
} from '@/services/guidesApi';
import { renderGuideHtml } from './buildGuide';

function fmt(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function PublishButton() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<PublishStatus | null>(null);
  const [busy, setBusy] = React.useState(false);

  const id = project?.id;
  const url = id ? publicUrl(id) : '';

  React.useEffect(() => {
    if (!open || !id) return;
    setStatus(null);
    getPublishStatus(id)
      .then(setStatus)
      .catch(() => setStatus({ published: false, publishedAt: null }));
  }, [open, id]);

  const onPublish = async () => {
    if (!project || !id) return;
    if (project.sections.length === 0) {
      toast.error('La guía no tiene secciones');
      return;
    }
    setBusy(true);
    try {
      const html = renderGuideHtml(project);
      const r = await publishGuide(id, html);
      setStatus({ published: true, publishedAt: r.publishedAt });
      toast.success('Guía publicada — los alumnos ya ven esta versión');
    } catch {
      toast.error('No se pudo publicar');
    } finally {
      setBusy(false);
    }
  };

  const onUnpublish = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await unpublishGuide(id);
      setStatus({ published: false, publishedAt: null });
      toast.success('Guía despublicada');
    } catch {
      toast.error('No se pudo despublicar');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} title="Publicar la guía para los alumnos">
        <Globe className="h-4 w-4" /> Publicar
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar guía</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Los alumnos verán la versión publicada en este link. Al publicar de nuevo, se reemplaza
            por la versión actual (el link no cambia).
          </p>

          <div className="flex items-center gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="text-sm" />
            <Button variant="outline" size="icon" onClick={copy} title="Copiar link" disabled={!status?.published}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(url, '_blank', 'noopener')}
              title="Abrir link"
              disabled={!status?.published}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {status === null
              ? 'Cargando estado…'
              : status.published
                ? 'Publicada · última publicación ' + fmt(status.publishedAt)
                : 'Todavía no está publicada. El link dará error hasta que publiques.'}
          </p>

          <DialogFooter>
            {status?.published && (
              <Button variant="ghost" onClick={onUnpublish} disabled={busy}>
                Despublicar
              </Button>
            )}
            <Button onClick={onPublish} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {status?.published ? 'Actualizar publicación' : 'Publicar ahora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
