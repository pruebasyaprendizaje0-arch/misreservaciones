import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'misreservaciones',
    template: '%s | misreservaciones',
  },
  description: 'Plataforma de reservaciones multi-tenant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
