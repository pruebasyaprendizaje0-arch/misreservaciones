import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { ProfileForm } from '@/components/dashboard/ProfileForm';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) notFound();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl bg-slate-900 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>⚙️</span> Perfil del Negocio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              <span className="font-semibold text-indigo-400">{tenant.name}</span> · Esta información aparece en tu página pública
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}`} className="rounded-lg bg-slate-800 border border-slate-700/80 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-sm">
              🏠 App principal
            </Link>
            <Link href={`/${locale}/dashboard/${slug}`} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 px-4 py-2 text-sm font-bold text-white transition-all shadow-sm">
              ← Volver al Panel
            </Link>
          </div>

        </div>

        <ProfileForm
          slug={slug}
          locale={locale}
          initial={{
            name: tenant.name,
            description: tenant.description,
            phone: tenant.phone,
            address: tenant.address,
            provincia: tenant.provincia,
            canton: tenant.canton,
            parroquia: tenant.parroquia,
            comuna: (tenant as any).comuna ?? null,
            lat: tenant.lat,

            lng: tenant.lng,
            logoUrl: tenant.logoUrl,
            coverUrl: tenant.coverUrl,
            metadata: tenant.metadata,
            industry: tenant.industry,
          }}
        />

      </div>
    </div>
  );
}
