import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';

/** Small autosave status: flashes "Guardando…" on edits, otherwise "Guardado". */
export function SaveIndicator() {
  const updatedAt = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId)?.updatedAt);
  const [saving, setSaving] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaving(true);
    const t = setTimeout(() => setSaving(false), 600);
    return () => clearTimeout(t);
  }, [updatedAt]);

  if (!updatedAt) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Se guarda automáticamente en este navegador">
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5 text-success" />
      )}
      {saving ? 'Guardando…' : 'Guardado'}
    </span>
  );
}
