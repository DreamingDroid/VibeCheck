import { MetadataRoute } from 'next';
import { SITE_URL, isProductionEnvironment } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  // If in UAT, testing, or development, explicitly disallow all search engines
  if (!isProductionEnvironment()) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  // Production indexing rules
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/event/*',
          '/local-currents',
          '/calendar',
          '/manifest.webmanifest',
          '/favicon.ico',
          '/apple-icon.png',
          '/apple-touch-icon.png',
        ],
        disallow: [
          '/admin/',
          '/admin/*',
          '/dashboard/',
          '/dashboard/*',
          '/preferences/',
          '/preferences/*',
          '/api/',
          '/api/*',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
