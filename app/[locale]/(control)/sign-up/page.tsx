import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/components/auth/sign-up-form';

export default async function SignUpPage() {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl space-y-6 backdrop-blur-xl text-white">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-900 p-6 text-white space-y-2 shadow-xl border border-indigo-500/30">
          <span className="inline-block rounded-full bg-yellow-400/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-yellow-300 border border-yellow-400/30 backdrop-blur-md">
            🎁 30 Días de Prueba Gratis
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Registra tu Negocio o Demo
          </h1>
          <p className="text-xs text-indigo-100 font-medium leading-relaxed">
            Obtén tu subdominio de reservas al instante sin necesidad de tarjeta de crédito. Incluye datos de prueba y calendario activo.
          </p>
        </div>

        <SignUpForm />
      </div>
    </div>
  );
}
