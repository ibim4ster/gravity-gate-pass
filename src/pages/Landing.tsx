import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Ticket, QrCode, BarChart3, Users, Sparkles } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Compra Express', desc: 'Compra entradas sin registro. Solo nombre y email.' },
  { icon: QrCode, title: 'QR Seguro', desc: 'Cada ticket lleva una firma digital única e infalsificable.' },
  { icon: Shield, title: 'Antifraude', desc: 'Prevención de doble entrada con validación en tiempo real.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Dashboard completo con métricas de ventas y aforo.' },
  { icon: Users, title: 'Control de Staff', desc: 'Asigna roles y eventos a tu equipo de puerta.' },
  { icon: Ticket, title: 'Wallet Digital', desc: 'Todos tus tickets en un solo lugar, siempre accesibles.' },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
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
              Plataforma de ticketing inteligente
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              Experiencias sin{' '}
              <span className="text-primary">fricción</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Gravity es el ecosistema de venta de entradas diseñado para la conversión máxima 
              y seguridad total en puerta. Compra, valida y gestiona — todo en un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/events">
                <Button size="lg" className="rounded-xl text-base px-8 gap-2 shadow-lg shadow-primary/25">
                  Explorar eventos <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              {!user && (
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="rounded-xl text-base px-8">
                    Crear cuenta gratis
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Todo lo que necesitas
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Desde la compra express hasta el control de puerta, Gravity cubre cada paso del proceso.
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

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center space-y-8 glass-card p-12"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight">
              ¿Listo para empezar?
            </h2>
            <p className="text-muted-foreground">
              Únete a Gravity y descubre una nueva forma de gestionar tus eventos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/events">
                <Button size="lg" className="rounded-xl px-8 gap-2">
                  Ver eventos <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-[10px]">G</span>
            </div>
            <span className="font-display font-semibold text-sm">Gravity</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Gravity. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
