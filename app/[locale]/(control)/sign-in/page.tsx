import { getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/auth/sign-in-form';

export default async function SignInPage() {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">{t('signIn')}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Accede al panel de tu negocio.
      </p>
      <div className="mt-6">
        <SignInForm />
      </div>
    </div>
  );
}
