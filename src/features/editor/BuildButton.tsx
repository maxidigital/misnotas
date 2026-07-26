import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import { openGuide } from './buildGuide';

export function BuildButton() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));

  const onBuild = () => {
    if (!project) {
      toast.error('No hay proyecto activo');
      return;
    }
    if (project.sections.length === 0) {
      toast.error('El proyecto no tiene secciones');
      return;
    }
    openGuide(project);
    toast.success('Vista previa abierta (pestaña nueva)');
  };

  return (
    <Button variant="outline" size="sm" onClick={onBuild} title="Ver la guía navegable (pestaña nueva, no publica)">
      <Eye className="h-4 w-4" /> Vista previa
    </Button>
  );
}
