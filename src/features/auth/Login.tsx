import { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Login() {
  const login = useAuth((s) => s.login);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pw) return;
    setBusy(true);
    const ok = await login(pw);
    setBusy(false);
    if (!ok) setErr(true);
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <img src="/blasco.png" alt="" className="mx-auto h-16 w-16 object-contain dark:invert" />
        <div className="text-lg font-semibold">misnotas</div>
        <Input
          type="password"
          autoFocus
          placeholder="Contraseña"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {err && <p className="text-sm text-destructive">Contraseña incorrecta</p>}
        <Button className="w-full" onClick={submit} disabled={busy || !pw}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </div>
    </div>
  );
}
