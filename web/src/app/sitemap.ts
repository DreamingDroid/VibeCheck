import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const PRIVATE_BACKEND_TOKEN = process.env.PRIVATE_BACKEND_TOKEN || '';

async function fetchPublicEvents() {
  try {
    const headers: Record<string, string> = {};
    if (PRIVATE_BACKEND_TOKEN) {
      headers['Authorization'] = `Bearer ${PRIVATE_BACKEND_TOKEN}`;
    }
    const res = await fetch(`${BACKEND_URL}/api/events`, {
      headers,
      next: { revalidate: 3600 }, // revalidate hourly
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error('[Sitemap] Failed to fetch events:', err);
    return [];
  }
}

async function fetchPublicNews() {
  try {
    const headers: Record<string, string> = {};
    if (PRIVATE_BACKEND_TOKEN) {
      headers['Authorization'] = `Bearer ${PRIVATE_BACKEND_TOKEN}`;
    }
    const res = await fetch(`${BACKEND_URL}/api/news`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error('[Sitemap] Failed to fetch news:', err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, news] = await Promise.all([
    fetchPublicEvents(),
    fetchPublicNews(),
  ]);

  const now = new Date();

  // Core Static URLs
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/local-currents`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/calendar`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // Dynamic Event URLs
  const eventRoutes: MetadataRoute.Sitemap = events.map((event: any) => ({
    url: `${SITE_URL}/event/${event.id}`,
    lastModified: event.updated_at ? new Date(event.updated_at) : (event.created_at ? new Date(event.created_at) : now),
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  // News Categories
  const newsCategories = ['General', 'Events', 'Tech', 'Culture', 'Music', 'Lifestyle'];
  const categoryRoutes: MetadataRoute.Sitemap = newsCategories.map((cat) => ({
    url: `${SITE_URL}/local-currents?category=${encodeURIComponent(cat)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...eventRoutes, ...categoryRoutes];
}
