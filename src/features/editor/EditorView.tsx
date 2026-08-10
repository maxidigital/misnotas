import { useEffect, useState } from 'react';
import { getGuide, updateGuide, ApiError } from '@/services/guidesApi';
import { useEditorStore } from '@/store/useEditorStore';
import { useSaveStatus } from '@/store/useSaveStatus';
import { useAuth } from '@/store/useAuth';
import { TopBar } from '@/components/layout/TopBar';
import { EditorWorkspace } from '@/features/editor/EditorWorkspace';
import type { Project } from '@/types';

export function EditorView({ guideId }: { guideId: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  // Load the guide from the server into the store.
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getGuide(guideId)
      .then((p) => {
        if (cancelled) return;
        useEditorStore.getState().loadProject(p);
        useSaveStatus.getState().set('idle');
        setState('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) useAuth.getState().logout();
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [guideId]);

  // Autosave (debounced) whenever the active project's data changes.
  useEffect(() => {
    if (state !== 'ready') return;
    const setStatus = useSaveStatus.getState().set;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let lastSaved = useEditorStore.getState().getActiveProject()?.updatedAt || '';
    let pending: Project | null = null; // lo editado que todavía no confirmó el servidor

    const save = () => {
      const p = pending;
      if (!p) return;
      updateGuide(p.id, p)
        .then(() => {
          if (pending === p) pending = null; // no entró nada nuevo mientras guardábamos
          setStatus('saved'); // siempre: un guardado bueno deja obsoleto cualquier error previo
        })
        .catch((e) => {
          setStatus('error');
          // Si venció la sesión no sirve reintentar: hay que volver a entrar.
          if (e instanceof ApiError && e.status === 401) return useAuth.getState().logout();
          if (retry) clearTimeout(retry);
          retry = setTimeout(save, 5000); // insistir: el trabajo sigue en memoria
        });
    };

    const unsub = useEditorStore.subscribe((s) => {
      const p = s.projects.find((pp) => pp.id === s.activeProjectId);
      if (!p || p.updatedAt === lastSaved) return; // only data edits bump updatedAt
      lastSaved = p.updatedAt;
      pending = p;
      if (retry) clearTimeout(retry);
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 800);
    });

    // Cerrar la pestaña con cambios sin confirmar pierde trabajo: avisar antes.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!pending) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      if (timer) clearTimeout(timer);
      if (retry) clearTimeout(retry);
      window.removeEventListener('beforeunload', onBeforeUnload);
      unsub();
      // Salir del editor (← Mis guías) dentro de la ventana del debounce no debe perder
      // el último cambio: se manda igual, sin esperar respuesta.
      if (pending) updateGuide(pending.id, pending).catch(() => {});
    };
  }, [state]);

  if (state === 'loading')
    return <div className="flex h-full items-center justify-center text-muted-foreground">Cargando guía…</div>;

  if (state === 'error')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>No se pudo abrir la guía.</p>
        <button className="text-primary underline" onClick={() => (location.hash = '#/')}>
          ← Mis guías
        </button>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <EditorWorkspace />
    </div>
  );
}
