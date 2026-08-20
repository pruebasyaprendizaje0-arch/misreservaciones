import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/components/auth/sign-up-form';

export default async function SignUpPage() {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-3xl border border-indigo-100 bg-white p-8 shadow-xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white space-y-2 shadow-md">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-yellow-300 backdrop-blur-md">
            🎁 30 Días de Prueba Gratis
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Registra tu Negocio o Demo
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Obtén tu subdominio de reservas al instante sin necesidad de tarjeta de crédito. Incluye datos de prueba y calendario activo.
          </p>
        </div>

        <SignUpForm />
      </div>
    </div>
  );
}
