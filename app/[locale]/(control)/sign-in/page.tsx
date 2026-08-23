import { getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/auth/sign-in-form';

export default async function SignInPage() {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl space-y-6 backdrop-blur-xl text-white">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-900 p-6 text-white space-y-1 shadow-xl border border-indigo-500/30">
          <span className="inline-block rounded-full bg-indigo-400/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-300 border border-indigo-400/30">
            🔐 Acceso Administradores
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {t('signIn')}
          </h1>
          <p className="text-xs text-indigo-100 font-medium leading-relaxed">
            Accede al panel de control de tu negocio.
          </p>
        </div>

        <SignInForm />
      </div>
    </div>
  );
}
