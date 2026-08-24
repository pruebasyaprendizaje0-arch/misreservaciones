import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://misreservaciones.ubicame.cc'),
  title: {
    default: 'misreservaciones - Plataforma Multi-Tenant de Reservas del Ecuador',
    template: '%s | misreservaciones',
  },
  description: 'Plataforma multi-tenant de reservaciones para hostales, clínicas, peluquerías y centros de spa en Ecuador.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'misreservaciones',
    description: 'Plataforma multi-tenant de reservaciones para hostales, clínicas, peluquerías y centros de spa en Ecuador.',
    url: 'https://misreservaciones.ubicame.cc',
    siteName: 'misreservaciones',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'misreservaciones Logo',
      },
    ],
    locale: 'es_EC',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

