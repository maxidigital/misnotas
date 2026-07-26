import * as React from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';

function slug(s: string) {
  // NFD decomposes accents into base letter + combining mark; the [^a-z0-9]
  // filter then drops the combining marks, leaving plain ascii.
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'proyecto'
  );
}

export function ImportExport() {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const active = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const importProject = useEditorStore((s) => s.importProject);

  const doExport = () => {
    if (!active) {
      toast.error('No hay proyecto para exportar');
      return;
    }
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(active.name)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Proyecto exportado');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Project;
      if (!data || !Array.isArray(data.sections)) throw new Error('Formato inválido');
      importProject(data);
      toast.success(`Proyecto “${data.name || 'importado'}” importado`);
    } catch (err) {
      toast.error('No se pudo importar: ' + (err instanceof Error ? err.message : 'archivo inválido'));
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} title="Importar un proyecto JSON">
        <Upload className="h-4 w-4" /> Importar
      </Button>
      <Button variant="ghost" size="sm" onClick={doExport} title="Exportar el proyecto activo a JSON">
        <Download className="h-4 w-4" /> Exportar
      </Button>
    </>
  );
}
