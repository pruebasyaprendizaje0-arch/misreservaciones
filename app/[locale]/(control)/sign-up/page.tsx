import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/components/auth/sign-up-form';

export default async function SignUpPage() {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">{t('signUp')}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Crea tu cuenta y provisiona tu negocio.
      </p>
      <div className="mt-6">
        <SignUpForm />
      </div>
    </div>
  );
}
