import { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bms.vercel.app';
  return [{ url: `${baseUrl}/login`, lastModified: new Date(), priority: 1 }];
}
