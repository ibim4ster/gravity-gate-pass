import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { Home, Ticket, ScanLine, LayoutDashboard, LogIn, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const AppNav = () => {
  const { user, profile, roles, hasRole, signOut, loading } = useAuth();
  const location = useLocation();

  const items: { label: string; path: string; icon: React.ElementType }[] = [
    { label: 'Eventos', path: '/', icon: Home },
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

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-display font-bold text-primary-foreground text-sm">G</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            Gravity
          </span>
        </Link>

        {/* Nav items */}
        <nav className="hidden md:flex items-center gap-1">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {!loading && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                {roles.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {r}
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {profile?.display_name || user.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading ? (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </Link>
          ) : null}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex border-t border-border">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
        {!user && (
          <Link
            to="/auth"
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium text-muted-foreground"
          >
            <LogIn className="w-5 h-5" />
            Entrar
          </Link>
        )}
      </nav>
    </header>
  );
};

export default AppNav;
