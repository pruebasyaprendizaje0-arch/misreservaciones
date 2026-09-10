import { MetadataRoute } from 'next';
import { prismaControl } from '@/lib/db/control';
import { getCentralBusinesses } from '@/lib/central-api';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misreservaciones.com';

  let tenantsList: Array<{ slug: string; updatedAt: Date }> = [];

  // 1. Fetch from Central API
  try {
    const centralBusinesses = await getCentralBusinesses();
    if (centralBusinesses && centralBusinesses.length > 0) {
      tenantsList = centralBusinesses.map((b) => ({
        slug: b.slug,
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
      }));
    }
  } catch (err) {
    console.warn('[sitemap] Warning: Central API businesses fetch failed for sitemap:', err);
  }

  // 2. Fallback to Local Prisma if empty
  if (tenantsList.length === 0) {
    try {
      const localTenants = await prismaControl.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: { slug: true, updatedAt: true },
      });
      if (localTenants && localTenants.length > 0) {
        tenantsList = localTenants;
      }
    } catch (err) {
      console.warn('[sitemap] Warning: Local Prisma fallback failed for sitemap:', err);
    }
  }

  const tenantUrls = tenantsList.flatMap((t) => [
    {
      url: `${baseUrl}/es/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/es/${t.slug}/reservar`,
      lastModified: t.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/${t.slug}/reservar`,
      lastModified: t.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ]);

  return [
    {
      url: `${baseUrl}/es`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/es/directorio`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/en/directorio`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.85,
    },
    ...tenantUrls,
  ];
}

