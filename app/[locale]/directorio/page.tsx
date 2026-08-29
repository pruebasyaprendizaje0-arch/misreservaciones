import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { prismaControl } from '@/lib/db/control';
import { ECUADOR_GEO, type Provincia, getCantonesForProvincia, getParroquiasForCanton, getComunasForParroquia } from '@/lib/ecuador-geo';
import { MACRO_CATEGORIES, getIndustriesByCategory } from '@/lib/industries';


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEs = locale === 'es';

  const title = isEs
    ? 'Directorio de Negocios y Hostales en Ecuador | Reservas Directas'
    : 'Directory of Businesses and Hostels in Ecuador | Direct Bookings';

  const description = isEs
    ? 'Encuentra hostales, salones de belleza, spas de masajes y consultorios médicos en Olón, Montañita, Santa Elena y todo Ecuador. Realiza tu reserva directa en línea.'
    : 'Find hostels, salons, massage spas, and medical clinics in Olon, Montanita, Santa Elena, and all of Ecuador. Book directly online.';

  return {
    title,
    description,
    keywords: [
      'directorio hostales ecuador',
      'hostales en olon',
      'hostales en montañita',
      'hostales santa elena ecuador',
      'reservas directas hostal',
      'peluquerias santa elena',
      'masajes santa elena',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: isEs ? 'es_EC' : 'en_US',
    },
    alternates: {
      canonical: `https://misreservaciones.com/${locale}/directorio`,
    },
  };
}

const INDUSTRY_ICONS: Record<string, string> = {
  HOSTAL: '🏨',
  MASAJE: '💆',
  PELUQUERIA: '💈',
  MEDICO: '🩺',
};

const INDUSTRY_LABELS: Record<string, string> = {
  HOSTAL: 'Hostal / Alojamiento',
  MASAJE: 'Spa / Masajes',
  PELUQUERIA: 'Peluquería / Barbería',
  MEDICO: 'Consultorio Médico',
};

import { getCentralBusinesses } from '@/lib/central-api';

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    provincia?: string;
    canton?: string;
    parroquia?: string;
    comuna?: string;
    industry?: string;
    q?: string;
  }>;
}) {
  const { locale } = await params;
  const { provincia, canton, parroquia, comuna, industry, q } = await searchParams;

  let rawBusinesses: any[] = [];
  try {
    rawBusinesses = await getCentralBusinesses();
  } catch (err) {
    console.warn('[DirectoryPage] Warning: Failed to fetch businesses from Central API:', err);
  }

  // Fallback to local Prisma if Central API returned empty and local DB is available
  if (rawBusinesses.length === 0) {
    try {
      const whereClause: any = { status: 'ACTIVE' };
      if (provincia) whereClause.provincia = provincia;
      if (canton) whereClause.canton = canton;
      if (parroquia) whereClause.parroquia = parroquia;
      if (comuna) whereClause.comuna = comuna;
      if (industry) whereClause.industry = industry;
      if (q && q.trim()) {
        const searchTerm = q.trim();
        whereClause.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { address: { contains: searchTerm, mode: 'insensitive' } },
          { comuna: { contains: searchTerm, mode: 'insensitive' } },
          { parroquia: { contains: searchTerm, mode: 'insensitive' } },
          { canton: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
      const localTenants = await prismaControl.tenant.findMany({
        where: whereClause,
        orderBy: [{ plan: 'desc' }, { name: 'asc' }],
        take: 60,
      });
      if (localTenants && localTenants.length > 0) {
        rawBusinesses = localTenants;
      }
    } catch (e) {
      console.warn('[DirectoryPage] Warning: Local Prisma fallback also failed or unavailable:', e);
    }
  }

  // Map and filter businesses cleanly
  const tenants = rawBusinesses
    .map((b) => {
      const primaryBranch = b.branches && b.branches.length > 0 ? b.branches[0] : null;
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        industry: b.industry || 'RESTAURANTE',
        description: b.description || null,
        logoUrl: b.logoUrl || null,
        coverUrl: b.coverUrl || null,
        phone: primaryBranch?.phone || b.phone || b.whatsapp || null,
        address: primaryBranch?.address || b.address || null,
        provincia: primaryBranch?.provincia || b.provincia || null,
        canton: primaryBranch?.city || b.canton || null,
        parroquia: b.parroquia || null,
        comuna: b.comuna || null,
        lat: primaryBranch?.lat || b.lat || null,
        lng: primaryBranch?.lng || b.lng || null,
        plan: b.plan || 'FREE',
      };
    })
    .filter((t) => {
      if (industry && t.industry.toUpperCase() !== industry.toUpperCase()) return false;
      if (provincia && t.provincia && !t.provincia.toLowerCase().includes(provincia.toLowerCase())) return false;
      if (canton && t.canton && !t.canton.toLowerCase().includes(canton.toLowerCase())) return false;
      if (q && q.trim()) {
        const searchTerm = q.trim().toLowerCase();
        const matchesName = t.name.toLowerCase().includes(searchTerm);
        const matchesDesc = t.description ? t.description.toLowerCase().includes(searchTerm) : false;
        const matchesAddress = t.address ? t.address.toLowerCase().includes(searchTerm) : false;
        const matchesCanton = t.canton ? t.canton.toLowerCase().includes(searchTerm) : false;
        const matchesProvincia = t.provincia ? t.provincia.toLowerCase().includes(searchTerm) : false;
        if (!matchesName && !matchesDesc && !matchesAddress && !matchesCanton && !matchesProvincia) return false;
      }
      return true;
    });

  const availableCantones = provincia ? getCantonesForProvincia(provincia) : [];
  const availableParroquias = provincia && canton ? getParroquiasForCanton(provincia, canton) : [];
  const availableComunas = provincia && canton && parroquia ? getComunasForParroquia(provincia, canton, parroquia) : [];

  // Schema.org CollectionPage / ItemList for GEO & SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Directorio de Negocios y Hostales en Ecuador',
    numberOfItems: tenants.length,
    itemListElement: tenants.map((t, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: t.name,
      url: `https://misreservaciones.com/${locale}/${t.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header Banner */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-14 px-6 border-b border-indigo-900/50">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-slate-950/90 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-400/40 shadow-lg">
            <span>📍</span> ECUADOR GEO & DIRECTORY ENGINE
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Directorio de Negocios y Servicios del Ecuador 🇪🇨
          </h1>
          <p className="text-slate-300 text-base max-w-2xl">
            Encuentra alojamientos en la Ruta del Spondylus (Olón, Montañita, Ayangue) y negocios locales. Realiza tu reserva directa sin intermediarios.
          </p>

          {/* Search Form */}
          <form method="GET" className="pt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Buscar por nombre, palabra clave..."
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              name="industry"
              defaultValue={industry || ''}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las Industrias</option>
              {(() => {
                const categorized = getIndustriesByCategory();
                return MACRO_CATEGORIES.map((cat) => (
                  <optgroup key={cat.key} label={`${cat.icon} ${cat.name}`} className="bg-slate-900 font-bold text-indigo-300">
                    {categorized[cat.key].map((ind) => (
                      <option key={ind.key} value={ind.key} className="bg-slate-800 text-white font-normal">
                        {ind.icon} {ind.name}
                      </option>
                    ))}
                  </optgroup>
                ));
              })()}
            </select>

            <select
              name="provincia"
              defaultValue={provincia || ''}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las Provincias</option>
              {ECUADOR_GEO.map((p: Provincia) => (
                <option key={p.nombre} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}

            </select>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 text-sm transition shadow-lg flex items-center justify-center gap-2"
            >
              🔍 Buscar Negocios
            </button>

            {(provincia || canton || parroquia || comuna || industry || q) && (
              <a
                href={`/${locale}/directorio`}
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 text-sm transition flex items-center justify-center"
              >
                ✖ Limpiar filtros
              </a>
            )}
          </form>
        </div>
      </header>

      {/* Directory Grid */}
      <main className="mx-auto max-w-6xl px-6 py-12 flex-1 w-full space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {tenants.length === 0
              ? 'No se encontraron negocios con los filtros seleccionados'
              : `Se encontraron ${tenants.length} negocio(s)`}
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Reserva directa sin comisiones
          </span>
        </div>

        {tenants.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
            <div className="text-5xl">🔍</div>
            <h3 className="text-lg font-bold text-slate-800">No encontramos resultados exactos</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Intenta cambiar los términos de búsqueda o seleccionar otra provincia/cantón.
            </p>
            <a
              href={`/${locale}/directorio`}
              className="inline-block rounded-xl bg-indigo-600 text-white px-6 py-2.5 text-sm font-bold shadow-md hover:bg-indigo-700 transition"
            >
              Ver todos los negocios
            </a>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((t) => {
              const icon = INDUSTRY_ICONS[t.industry] ?? '🏢';
              const industryLabel = INDUSTRY_LABELS[t.industry] ?? t.industry;
              const locationStr = [
                t.comuna ? `Comuna ${t.comuna}` : null,
                t.parroquia,
                t.canton,
                t.provincia,
              ]
                .filter(Boolean)
                .join(', ');

              const rawPhone = t.phone ? t.phone.replace(/[^0-9]/g, '') : null;
              const whatsappNumber = rawPhone
                ? rawPhone.startsWith('593')
                  ? rawPhone
                  : '593' + rawPhone.replace(/^0/, '')
                : null;
              const whatsappUrl = whatsappNumber
                ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ${t.name}, quisiera información.`)}`
                : null;

              const mapUrl =
                t.lat && t.lng
                  ? `https://www.google.com/maps?q=${t.lat},${t.lng}`
                  : `https://www.google.com/maps?q=${encodeURIComponent(`${t.name}, ${locationStr}, Ecuador`)}`;

              return (
                <div
                  key={t.id}
                  className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Cover or Header color */}
                    {t.coverUrl ? (
                      <div className="h-36 relative overflow-hidden bg-slate-100 border-b border-slate-100">
                        <img src={t.coverUrl} alt={t.name} className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                          {icon} {industryLabel}
                        </span>
                      </div>
                    ) : (
                      <div className="h-24 bg-gradient-to-br from-indigo-900 to-slate-900 p-4 flex items-start justify-between">
                        <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                          {icon} {industryLabel}
                        </span>
                      </div>
                    )}

                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-3">
                        {t.logoUrl && (
                          <img
                            src={t.logoUrl}
                            alt={t.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                          />
                        )}
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                            <Link href={`/${locale}/${t.slug}`} className="hover:text-indigo-600 transition">
                              {t.name}
                            </Link>
                          </h3>
                          {locationStr && (
                            <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                              <span>📍</span> {locationStr}
                            </p>
                          )}
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          &quot;{t.description}&quot;
                        </p>

                      )}

                      {t.address && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong>Dirección:</strong> {t.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-0 space-y-3">
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
                      >
                        📍 Mapa
                      </a>
                    </div>

                    <Link
                      href={`/${locale}/${t.slug}/reservar`}
                      className="block w-full text-center py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition"
                    >
                      📅 Reservar Ahora →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
