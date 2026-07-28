import { useEffect, useState } from 'react';
import { getGuide, updateGuide, ApiError } from '@/services/guidesApi';
import { useEditorStore } from '@/store/useEditorStore';
import { useSaveStatus } from '@/store/useSaveStatus';
import { useAuth } from '@/store/useAuth';
import { TopBar } from '@/components/layout/TopBar';
import { EditorWorkspace } from '@/features/editor/EditorWorkspace';

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
    let lastSaved = useEditorStore.getState().getActiveProject()?.updatedAt || '';

    const unsub = useEditorStore.subscribe((s) => {
      const p = s.projects.find((pp) => pp.id === s.activeProjectId);
      if (!p || p.updatedAt === lastSaved) return; // only data edits bump updatedAt
      lastSaved = p.updatedAt;
      setStatus('saving');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        updateGuide(p.id, p)
          .then(() => setStatus('saved'))
          .catch(() => setStatus('error'));
      }, 800);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [state]);

  // Persist open tabs per guide so they survive leaving and returning to the editor.
  useEffect(() => {
    if (state !== 'ready') return;
    const save = (s: ReturnType<typeof useEditorStore.getState>) => {
      const id = s.activeProjectId;
      if (!id) return;
      try {
        localStorage.setItem('editor.tabs:' + id, JSON.stringify({ open: s.openFolioIds, active: s.selection.folioId ?? null }));
      } catch {
        /* ignore */
      }
    };
    save(useEditorStore.getState());
    return useEditorStore.subscribe(save);
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
