import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://misreservaciones.ubicame.cc'),
  title: {
    default: 'reservaciones - Plataforma Multi-Tenant de Reservas del Ecuador',
    template: '%s | reservaciones',
  },
  description: 'Plataforma multi-tenant de reservaciones para hostales, clínicas, peluquerías y centros de spa en Ecuador.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'reservaciones',
    description: 'Plataforma multi-tenant de reservaciones para hostales, clínicas, peluquerías y centros de spa en Ecuador.',
    url: 'https://misreservaciones.ubicame.cc',
    siteName: 'reservaciones',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'reservaciones Logo',
      },
    ],
    locale: 'es_EC',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}


