export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://vibecheckspace.com').replace(/\/+$/, '');
export const SITE_NAME = 'VibeCheck Space';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/apple-touch-icon.png`;

export function isProductionEnvironment(): boolean {
  const appEnv = process.env.APP_ENV || '';
  const nextAuthUrl = process.env.NEXTAUTH_URL || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const vercelEnv = process.env.VERCEL_ENV || '';
  const vercelUrl = process.env.VERCEL_URL || '';

  // Block search crawlers if explicitly UAT, dev, staging, or preview
  if (
    appEnv === 'uat' ||
    appEnv === 'development' ||
    appEnv === 'local' ||
    vercelEnv === 'preview' ||
    vercelEnv === 'development' ||
    nextAuthUrl.includes('uat') ||
    nextAuthUrl.includes('preview') ||
    nextAuthUrl.includes('localhost') ||
    siteUrl.includes('uat') ||
    siteUrl.includes('preview') ||
    siteUrl.includes('localhost') ||
    vercelUrl.includes('uat') ||
    vercelUrl.includes('preview')
  ) {
    return false;
  }

  return true;
}

export interface EventSchemaProps {
  id: string | number;
  title: string;
  description: string;
  category?: string;
  dateTime: string;
  endTime?: string;
  venue?: string;
  location?: string;
  city?: string;
  imageUrl?: string;
  isPaid?: boolean;
  ticketPrice?: number | string;
  organizerName?: string;
  status?: string;
}

export interface NewsArticleSchemaProps {
  id: string | number;
  title: string;
  content: string;
  category?: string;
  author?: string;
  imageUrl?: string;
  city?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Generate Schema.org/Event JSON-LD structured data for Google Search & Events
 */
export function generateEventJsonLd(event: EventSchemaProps) {
  let startDate = new Date().toISOString();
  try {
    startDate = new Date(event.dateTime).toISOString();
  } catch (_) {}

  let endDate: string | undefined = undefined;
  if (event.endTime) {
    try {
      endDate = new Date(event.endTime).toISOString();
    } catch (_) {}
  }
  
  if (!endDate) {
    try {
      const end = new Date(event.dateTime);
      end.setHours(end.getHours() + 3);
      endDate = end.toISOString();
    } catch (_) {}
  }

  const isHousefull = event.status === 'housefull';
  const availability = isHousefull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate,
    endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue || event.location || 'Vizag',
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venue || event.location || '',
        addressLocality: event.city || 'Vizag',
        addressRegion: 'Andhra Pradesh',
        addressCountry: 'IN',
      },
    },
    image: event.imageUrl ? [event.imageUrl] : [DEFAULT_OG_IMAGE],
    organizer: {
      '@type': 'Organization',
      name: event.organizerName || 'VibeCheck Community',
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/event/${event.id}`,
      price: event.isPaid ? String(event.ticketPrice || '0') : '0',
      priceCurrency: 'INR',
      availability,
      validFrom: new Date().toISOString(),
    },
  };
}

/**
 * Generate Schema.org/NewsArticle JSON-LD structured data for Local Currents
 */
export function generateNewsArticleJsonLd(article: NewsArticleSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: (article.content || '').substring(0, 200).replace(/<[^>]*>?/gm, ''),
    articleBody: (article.content || '').replace(/<[^>]*>?/gm, ''),
    image: article.imageUrl ? [article.imageUrl] : [DEFAULT_OG_IMAGE],
    datePublished: article.createdAt ? new Date(article.createdAt).toISOString() : new Date().toISOString(),
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : (article.createdAt ? new Date(article.createdAt).toISOString() : new Date().toISOString()),
    author: {
      '@type': 'Person',
      name: article.author || 'VibeCheck Editorial',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/local-currents`,
    },
  };
}

/**
 * Global WebSite & Organization structured data
 */
export function generateRootJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: 'Discover local events, city news, culture, and community vibes.',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/dashboard?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        sameAs: [
          'https://twitter.com/vibecheckspace',
          'https://instagram.com/vibecheckspace',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          telephone: '+91-5551433589',
        },
      },
    ],
  };
}
