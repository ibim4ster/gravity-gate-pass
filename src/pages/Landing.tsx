import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Ticket, QrCode, BarChart3, Users, Sparkles } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Compra rápida', desc: 'Compra packs sin fricción y recíbelos al instante en tu wallet.' },
  { icon: QrCode, title: 'QR validable', desc: 'Cada compra genera un código seguro listo para canjear en barra.' },
  { icon: Shield, title: 'Control antifraude', desc: 'Evita canjes duplicados y valida en tiempo real con el scanner.' },
  { icon: BarChart3, title: 'Panel por local', desc: 'Métricas de ventas por bar/restaurante y por tipo de pack.' },
  { icon: Users, title: 'Gestión de staff', desc: 'Asigna personal a bares concretos para acceso segmentado.' },
  { icon: Ticket, title: 'Packs digitales', desc: 'Pincho individual, pack 5 pinchos o pack 5 vinos en un clic.' },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Calle San Juan · Logroño
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              Gravity para la{' '}
              <span className="text-primary">ruta de pinchos</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Descubre bares, compra packs y canjéalos con QR en segundos.
              Un flujo único para clientes, staff y administración en Calle San Juan.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/events">
                <Button size="lg" className="rounded-xl text-base px-8 gap-2 shadow-lg shadow-primary/25">
                  Ver bares y packs <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              {!user && (
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="rounded-xl text-base px-8">
                    Crear cuenta
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Todo el recorrido en una app
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Desde la compra del pack hasta el canje en cada bar, sin tickets en papel.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card-hover p-6 space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center space-y-8 glass-card p-12"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight">
              ¿Te vienes de pinchos?
            </h2>
            <p className="text-muted-foreground">
              Entra a Gravity, compra tu pack y empieza la ruta de San Juan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/events">
                <Button size="lg" className="rounded-xl px-8 gap-2">
                  Explorar bares <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-[10px]">G</span>
            </div>
            <span className="font-display font-semibold text-sm">Gravity</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Gravity · Ruta San Juan</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
