import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useSaveStatus } from '@/store/useSaveStatus';

/** Autosave status against the server: Guardando… / Guardado / Error. */
export function SaveIndicator() {
  const status = useSaveStatus((s) => s.status);

  if (status === 'idle') return null;
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
      </span>
    );
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" /> Error al guardar
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-success" /> Guardado
    </span>
  );
}
