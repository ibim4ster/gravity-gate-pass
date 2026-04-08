# Gravity Gate Pass - Ruta de Pinchos Calle San Juan / Calle San Juan Tapas Route

## 🌐 Language Selection | Selección de Idioma

<details>
<summary>🇪🇸 Español</summary>

# Gravity Gate Pass - Ruta de Pinchos Calle San Juan

Plataforma de ticketing digital para la famosa Ruta de Pinchos de la Calle San Juan en Logroño, España. Permite comprar packs digitales de pinchos y vinos, y canjearlos mediante códigos QR en los bares participantes.

## 🎯 Características Principales

### Para Clientes
- **Descubrimiento de Bares**: Explora los establecimientos participantes en Calle San Juan con búsqueda y filtrado
- **Compra Digital**: Proceso de checkout seguro con Stripe integrado
- **Billetera Digital**: Almacena y gestiona tus packs de pinchos comprados
- **QR Codes**: Códigos QR únicos con sistema de firma dual para evitar fraudes

### Para Staff
- **Escáner QR**: Validación rápida de tickets en móvil
- **Control de Acceso**: Solo pueden escanear en los bares asignados
- **Registro de Actividad**: Auditoría completa de todos los canjes

### Para Administradores
- **Gestión de Bares**: Catálogo de establecimientos y ofertas
- **Configuración de Precios**: Definición de packs y disponibilidad
- **Monitorización**: Logs en tiempo real y estadísticas
- **Gestión de Usuarios**: Roles y permisos

## 🏗️ Arquitectura Técnica

### Frontend
- **React 18** con TypeScript y Vite
- **Tailwind CSS** con diseño glassmorphism
- **shadcn/ui** componentes accesibles
- **Framer Motion** para animaciones
- **React Router** para navegación

### Backend
- **Supabase** como BaaS (Backend-as-a-Service)
  - PostgreSQL para base de datos
  - Autenticación integrada
  - Edge Functions con Deno
  - Row Level Security (RLS)

### Integraciones
- **Stripe**: Procesamiento de pagos
- **Supabase Auth**: Gestión de usuarios y roles
- **Google Maps**: Visualización de ubicación

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes UI reutilizables
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── AppNav.tsx      # Navegación principal
│   ├── EventCard.tsx   # Tarjeta de bar/evento
│   └── Footer.tsx      # Pie de página
├── pages/              # Páginas de la aplicación
│   ├── Index.tsx       # Landing principal
│   ├── Checkout.tsx    # Flujo de compra
│   ├── Scanner.tsx     # Escáner QR para staff
│   ├── Dashboard.tsx   # Panel de administración
│   └── Wallet.tsx      # Billetera digital
├── hooks/              # Hooks personalizados
├── integrations/       # Configuración de Supabase
└── lib/                # Utilidades
```

## 🚀 Configuración Local

### Prerrequisitos
- Node.js 18+
- Bun (recomendado) o npm
- Cuenta de Supabase
- Cuenta de Stripe (para pruebas)

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/ibim4ster/gravity-gate-pass.git
cd gravity-gate-pass

# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar desarrollo
bun dev
```

### Variables de Entorno
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## 🔐 Modelo de Seguridad

El sistema implementa múltiples capas de seguridad:

1. **Firma Dual QR**: Cada ticket contiene `qr_code|qr_signature` para evitar spoofing
2. **Row Level Security**: Políticas de acceso a nivel de fila en Supabase
3. **Roles de Usuario**: `admin`, `staff`, `client` con permisos diferenciados
4. **Validación Idempotente**: Prevención de duplicados en creación de tickets

## 📊 Flujo de Usuario

```mermaid
graph TD
    A[Usuario visita Index.tsx] --> B[Explora bares]
    B --> C[Selecciona pack]
    C --> D[Checkout.tsx]
    D --> E[Pago con Stripe]
    E --> F[verify-payment Edge Function]
    F --> G[Ticket generado]
    G --> H[QR en Wallet.tsx]
    H --> I[Escaneo en Scanner.tsx]
    I --> J[validate_and_redeem_ticket RPC]
```

## 🎨 Diseño y Branding

- **Paleta de Colores**: Basada en la identidad de Calle San Juan
  - Primary: Verde (#228c22)
  - Secondary: Crema cálido
  - Accent: Arena clara
- **Tipografía**: DM Sans para headers
- **Estilo**: Glassmorphism con `backdrop-blur-xl`

## 📱 Páginas Principales

| Página | Ruta | Descripción |
|--------|------|-------------|
| **Inicio** | `/` | Descubrimiento de bares y búsqueda |
| **Checkout** | `/checkout/:eventId/:tierId` | Flujo de compra |
| **Billetera** | `/wallet` | Gestión de tickets del usuario |
| **Escáner** | `/scanner` | Validación de QR (staff) |
| **Dashboard** | `/dashboard` | Panel de administración |
| **Contacto** | `/contacto` | Registro de nuevos bares |

## 🔧 Edge Functions

### `create-payment`
Crea sesión de checkout en Stripe para iniciar el proceso de pago.

### `verify-payment`
Procesa webhook de Stripe, crea tickets de forma idempotente.

### `admin-manage-user`
Función administrativa para gestión de usuarios con `service_role`.

## 📋 Base de Datos

### Tablas Principales
- `events`: Bares/establecimientos participantes
- `price_tiers`: Configuración de packs y precios
- `tickets`: Tickets generados con QR y estado
- `scan_logs`: Registro de auditoría de escaneos
- `user_roles`: Asignación de roles a usuarios

## 🚀 Despliegue

### Frontend (Vercel/Netlify)
```bash
bun build
# Desplegar la carpeta dist/
```

### Backend (Supabase)
```bash
supabase login
supabase link --project-ref your-project
supabase db push
supabase functions deploy
```

## 📄 Licencia

© 2026 Gravity · Ruta de Pinchos Calle San Juan · Logroño

</details>

<details>
<summary>🇬🇧 English</summary>

# Gravity Gate Pass - Calle San Juan Tapas Route

Digital ticketing platform for the famous Calle San Juan Tapas Route in Logroño, Spain. Allows purchasing digital packs of tapas and wines, and redeeming them via QR codes at participating bars.

## 🎯 Key Features

### For Customers
- **Bar Discovery**: Explore participating establishments on Calle San Juan with search and filtering
- **Digital Purchase**: Secure checkout process with Stripe integration
- **Digital Wallet**: Store and manage your purchased tapas packs
- **QR Codes**: Unique QR codes with dual-signature system to prevent fraud

### For Staff
- **QR Scanner**: Quick ticket validation on mobile
- **Access Control**: Only scan at assigned bars
- **Activity Logging**: Complete audit trail of all redemptions

### For Administrators
- **Bar Management**: Catalog of establishments and offers
- **Price Configuration**: Define packs and availability
- **Monitoring**: Real-time logs and statistics
- **User Management**: Roles and permissions

## 🏗️ Technical Architecture

### Frontend
- **React 18** with TypeScript and Vite
- **Tailwind CSS** with glassmorphism design
- **shadcn/ui** accessible components
- **Framer Motion** for animations
- **React Router** for navigation

### Backend
- **Supabase** as BaaS (Backend-as-a-Service)
  - PostgreSQL for database
  - Integrated authentication
  - Edge Functions with Deno
  - Row Level Security (RLS)

### Integrations
- **Stripe**: Payment processing
- **Supabase Auth**: User and role management
- **Google Maps**: Location visualization

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base components (shadcn/ui)
│   ├── AppNav.tsx      # Main navigation
│   ├── EventCard.tsx   # Bar/event card
│   └── Footer.tsx      # Footer
├── pages/              # Application pages
│   ├── Index.tsx       # Main landing
│   ├── Checkout.tsx    # Purchase flow
│   ├── Scanner.tsx     # QR scanner for staff
│   ├── Dashboard.tsx   # Admin panel
│   └── Wallet.tsx      # Digital wallet
├── hooks/              # Custom hooks
├── integrations/       # Supabase configuration
└── lib/                # Utilities
```

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- Bun (recommended) or npm
- Supabase account
- Stripe account (for testing)

### Installation
```bash
# Clone repository
git clone https://github.com/ibim4ster/gravity-gate-pass.git
cd gravity-gate-pass

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development
bun dev
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## 🔐 Security Model

The system implements multiple security layers:

1. **Dual QR Signature**: Each ticket contains `qr_code|qr_signature` to prevent spoofing
2. **Row Level Security**: Row-level access policies in Supabase
3. **User Roles**: `admin`, `staff`, `client` with differentiated permissions
4. **Idempotent Validation**: Duplicate prevention in ticket creation

## 📊 User Flow

```mermaid
graph TD
    A[User visits Index.tsx] --> B[Explore bars]
    B --> C[Select pack]
    C --> D[Checkout.tsx]
    D --> E[Stripe payment]
    E --> F[verify-payment Edge Function]
    F --> G[Ticket generated]
    G --> H[QR in Wallet.tsx]
    H --> I[Scan in Scanner.tsx]
    I --> J[validate_and_redeem_ticket RPC]
```

## 🎨 Design & Branding

- **Color Palette**: Based on Calle San Juan identity
  - Primary: Green (#228c22)
  - Secondary: Warm cream
  - Accent: Light sand
- **Typography**: DM Sans for headers
- **Style**: Glassmorphism with `backdrop-blur-xl`

## 📱 Main Pages

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Bar discovery and search |
| **Checkout** | `/checkout/:eventId/:tierId` | Purchase flow |
| **Wallet** | `/wallet` | User ticket management |
| **Scanner** | `/scanner` | QR validation (staff) |
| **Dashboard** | `/dashboard` | Admin panel |
| **Contact** | `/contacto` | New bar registration |

## 🔧 Edge Functions

### `create-payment`
Creates Stripe checkout session to initiate payment process.

### `verify-payment`
Processes Stripe webhook, creates tickets idempotently.

### `admin-manage-user`
Admin function for user management with `service_role`.

## 📋 Database

### Main Tables
- `events`: Participating bars/establishments
- `price_tiers`: Pack and price configuration
- `tickets`: Generated tickets with QR and status
- `scan_logs`: Scan audit log
- `user_roles`: User role assignments

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
bun build
# Deploy dist/ folder
```

### Backend (Supabase)
```bash
supabase login
supabase link --project-ref your-project
supabase db push
supabase functions deploy
```

## 📄 License

© 2026 Gravity · Ruta de Pinchos Calle San Juan · Logroño

</details>

---

## Notes

Este README bilingüe utiliza collapsible sections para permitir la selección entre español e inglés. El sistema Gravity Gate Pass está específicamente diseñado para el mercado español y la "Ruta de Pinchos" de Logroño, con localización en español y adaptación cultural al contexto de La Rioja.

This bilingual README uses collapsible sections to allow selection between Spanish and English. The Gravity Gate Pass system is specifically designed for the Spanish market and the "Ruta de Pinchos" of Logroño, with Spanish localization and cultural adaptation to the context of La Rioja.

Wiki pages you might want to explore:
- [Glossary (ibim4ster/gravity-gate-pass)](/wiki/ibim4ster/gravity-gate-pass#6)
