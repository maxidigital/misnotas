import { AlertCircle } from 'lucide-react';
import { useSaveStatus } from '@/store/useSaveStatus';

/** Solo se ve cuando algo va mal. Mientras el autosave funciona no muestra nada: el ir y venir
 *  de "Guardando…"/"Guardado" en cada tecla distraía y corría de lugar a los botones vecinos. */
export function SaveIndicator() {
  const status = useSaveStatus((s) => s.status);

  if (status !== 'error') return null;

  return (
    <span className="flex items-center gap-1 text-xs text-destructive" title="Error al guardar">
      <AlertCircle className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Error al guardar</span>
    </span>
  );
}
