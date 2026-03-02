import { useAppStore } from '@/lib/store';
import { UserRole } from '@/lib/types';
import { Link, useLocation } from 'react-router-dom';
import { Home, Ticket, ScanLine, LayoutDashboard, User, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const roleMenuItems: Record<UserRole, { label: string; path: string; icon: React.ElementType }[]> = {
  guest: [
    { label: 'Eventos', path: '/', icon: Home },
  ],
  client: [
    { label: 'Eventos', path: '/', icon: Home },
    { label: 'Mis Tickets', path: '/wallet', icon: Ticket },
  ],
  staff: [
    { label: 'Eventos', path: '/', icon: Home },
    { label: 'Scanner', path: '/scanner', icon: ScanLine },
  ],
  admin: [
    { label: 'Eventos', path: '/', icon: Home },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Scanner', path: '/scanner', icon: ScanLine },
  ],
};

const AppNav = () => {
  const { currentUser, switchRole, setUser } = useAppStore();
  const location = useLocation();
  const role = currentUser?.role ?? 'guest';
  const items = roleMenuItems[role];

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

        {/* Role switcher (demo) */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:block">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase tracking-wider">
                  {role}
                </span>
              </span>
              <button
                onClick={() => setUser(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {(['client', 'staff', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all capitalize"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
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
      </nav>
    </header>
  );
};

export default AppNav;
