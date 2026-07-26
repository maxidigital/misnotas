import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} title="Cambiar tema" aria-label="Cambiar tema">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
