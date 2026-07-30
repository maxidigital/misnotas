import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useSaveStatus } from '@/store/useSaveStatus';

/** Autosave status against the server: Guardando… / Guardado / Error. */
export function SaveIndicator() {
  const status = useSaveStatus((s) => s.status);

  if (status === 'idle') return null;
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Guardando…">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> <span className="hidden sm:inline">Guardando…</span>
      </span>
    );
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-xs text-destructive" title="Error al guardar">
        <AlertCircle className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Error al guardar</span>
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Guardado">
      <Check className="h-3.5 w-3.5 text-success" /> <span className="hidden sm:inline">Guardado</span>
    </span>
  );
}
