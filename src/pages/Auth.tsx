import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, ArrowLeft, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { lovable } from '@/integrations/lovable/index';

const Auth = () => {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setForgotSent(true);
        toast.success('Email de recuperación enviado. Revisa tu bandeja.');
      }
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      // Check if input is email or username
      let loginEmail = emailOrUsername;
      if (!emailOrUsername.includes('@')) {
        // Lookup email by display_name
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .ilike('display_name', emailOrUsername)
          .single();
        if (profile?.email) {
          loginEmail = profile.email;
        } else {
          toast.error('Usuario no encontrado');
          setLoading(false);
          return;
        }
      }
      const { error } = await signIn(loginEmail, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('¡Bienvenido de vuelta!');
        navigate('/', { replace: true });
      }
    } else {
      // Register - check username uniqueness
      if (displayName.trim()) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .ilike('display_name', displayName.trim())
          .maybeSingle();
        if (existing) {
          toast.error('Ese nombre de usuario ya está en uso. Elige otro.');
          setLoading(false);
          return;
        }
      }
      const { error } = await signUp(email, password, displayName.trim());
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Cuenta creada. Revisa tu email para confirmar.');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error('Error al iniciar sesión con Google');
        console.error('Google sign-in error:', error);
      }
    } catch (err) {
      toast.error('Error al iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        <div className="glass-card p-6 space-y-6">
          <div className="text-center space-y-2">
            <img src="/logo-sanjuan.png" alt="San Juan" className="h-14 mx-auto object-contain" />
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {mode === 'login' ? 'Bienvenido' : mode === 'register' ? 'Crear Cuenta' : 'Recuperar contraseña'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Accede con tu email o nombre de usuario'
                : mode === 'register'
                ? 'Tus compras anteriores se vincularán automáticamente'
                : 'Te enviaremos un enlace para restablecer tu contraseña'}
            </p>
          </div>

          {mode === 'forgot' ? (
            forgotSent ? (
              <div className="text-center space-y-4 py-4">
                <Mail className="w-12 h-12 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada.</p>
                <Button variant="outline" onClick={() => { setMode('login'); setForgotSent(false); }} className="rounded-xl">Volver al login</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail">Email</Label>
                  <Input id="forgotEmail" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" size="lg" disabled={loading} className="w-full font-display font-semibold rounded-xl">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar enlace de recuperación'}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => setMode('login')} className="text-sm text-primary hover:underline">Volver al login</button>
                </div>
              </form>
            )
          ) : (
            <>
              {/* Google Sign In */}
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full rounded-xl gap-3 h-11 font-medium"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continuar con Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">o con email</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {mode === 'register' && (
                    <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                      <Label htmlFor="displayName">Nombre de usuario *</Label>
                      <Input id="displayName" placeholder="Tu nombre de usuario único" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required={mode === 'register'} />
                      <p className="text-[11px] text-muted-foreground">Este nombre será único y lo podrás usar para iniciar sesión.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email">{mode === 'login' ? 'Email o nombre de usuario' : 'Email'}</Label>
                  {mode === 'login' ? (
                    <Input id="email" type="text" placeholder="tu@email.com o usuario" value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)} required />
                  ) : (
                    <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline">
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={loading} className="w-full font-display font-semibold rounded-xl">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === 'login' ? (
                    <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-2" /> Crear Cuenta</>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-primary hover:underline">
                  {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
