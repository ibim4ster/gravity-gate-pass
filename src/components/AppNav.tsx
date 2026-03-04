import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Link, useLocation } from 'react-router-dom';
import { Home, Ticket, ScanLine, LayoutDashboard, LogIn, LogOut, Sun, Moon, Menu, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const AppNav = () => {
  const { user, profile, roles, hasRole, signOut, loading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: { label: string; path: string; icon: React.ElementType }[] = [
    { label: 'Eventos', path: '/events', icon: Sparkles },
  ];

  if (user) {
    items.push({ label: 'Mis Tickets', path: '/wallet', icon: Ticket });
  }
  if (user && (hasRole('staff') || hasRole('admin'))) {
    items.push({ label: 'Scanner', path: '/scanner', icon: ScanLine });
  }
  if (user && hasRole('admin')) {
    items.push({ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard });
  }

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="font-display font-bold text-primary-foreground text-sm">G</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Gravity
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {!loading && user ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                {roles.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                    {r}
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                {profile?.display_name || user.email}
              </span>
              <button
                onClick={signOut}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading ? (
            <Link to="/auth">
              <Button size="sm" className="rounded-xl gap-2 font-medium">
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            </Link>
          ) : null}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <nav className="container py-3 space-y-1">
            {items.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted w-full"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default AppNav;
