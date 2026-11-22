import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bms.bagusin.sbs';

  return {
    rules: [
      { userAgent: '*', allow: '/login' },
      { userAgent: '*', disallow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
