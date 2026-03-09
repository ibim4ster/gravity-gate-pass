import { Link } from 'react-router-dom';
import { MapPin, Mail } from 'lucide-react';

const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo-sanjuan.png" alt="San Juan" className="h-10 object-contain" />
            <span className="font-display text-lg font-bold">Gravity</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La ruta de pinchos más famosa de Logroño. Compra tus packs y canjéalos con QR en los mejores bares de la Calle San Juan.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Enlaces</h4>
          <nav className="flex flex-col gap-2">
            <Link to="/" className="text-sm text-foreground hover:text-primary transition-colors">Bares & Packs</Link>
            <Link to="/wallet" className="text-sm text-foreground hover:text-primary transition-colors">Mis Packs</Link>
            <Link to="/contacto" className="text-sm text-foreground hover:text-primary transition-colors">Registrar mi bar</Link>
          </nav>
        </div>
        <div className="space-y-3">
          <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contacto</h4>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary shrink-0" /> Calle San Juan, Logroño, La Rioja
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 text-primary shrink-0" /> info@gravitysanjuan.com
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Gravity · Ruta de Pinchos Calle San Juan · Logroño</p>
        <p className="text-xs text-muted-foreground">Hecho con ❤️ en La Rioja</p>
      </div>
    </div>
  </footer>
);

export default Footer;
