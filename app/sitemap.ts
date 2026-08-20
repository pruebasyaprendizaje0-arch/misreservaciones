import { MetadataRoute } from 'next';
import { prismaControl } from '@/lib/db/control';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misreservaciones.com';

  let tenants: { slug: string; updatedAt: Date }[] = [];
  try {
    tenants = await prismaControl.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    });
  } catch (err) {
    console.warn('[sitemap] Database unreachable during build time, returning static base sitemap.');
  }

  const tenantUrls = tenants.flatMap((tenant) => [
    {
      url: `${baseUrl}/es/${tenant.slug}`,
      lastModified: tenant.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/es/${tenant.slug}/reservar`,
      lastModified: tenant.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/${tenant.slug}`,
      lastModified: tenant.updatedAt,
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
    ...tenantUrls,
  ];
}
