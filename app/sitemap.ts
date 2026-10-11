import { MetadataRoute } from 'next';

interface RouteConfig {
  path: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

const APP_ROUTES: RouteConfig[] = [
  // Root & Autentikasi Publik
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bms.vercel.app';
  const currentDate = new Date();

  return APP_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

