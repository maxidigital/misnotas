import { useEffect, useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { Login } from '@/features/auth/Login';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { EditorView } from '@/features/editor/EditorView';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const status = useAuth((s) => s.status);
  const check = useAuth((s) => s.check);
  const hash = useHash();

  useEffect(() => {
    check();
  }, [check]);

  if (status === 'checking')
    return <div className="flex h-full items-center justify-center text-muted-foreground">Cargando…</div>;

  if (status === 'out') return <Login />;

  const m = hash.match(/^#\/g\/(.+)$/);
  return m ? <EditorView guideId={m[1]} /> : <Dashboard />;
}
