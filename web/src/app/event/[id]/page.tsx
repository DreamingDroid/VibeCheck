import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, generateEventJsonLd, isProductionEnvironment } from "@/lib/seo";
import { EventDetailsClient } from "./EventDetailsClient";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const PRIVATE_BACKEND_TOKEN = process.env.PRIVATE_BACKEND_TOKEN || "";

async function getEvent(id: string) {
  try {
    const headers: Record<string, string> = {};
    if (PRIVATE_BACKEND_TOKEN) {
      headers["Authorization"] = `Bearer ${PRIVATE_BACKEND_TOKEN}`;
    }
    const res = await fetch(`${BACKEND_URL}/api/events/${id}`, {
      headers,
      next: { revalidate: 60 }, // Revalidate every minute
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error("[EventSSR] Error fetching event:", err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = await getEvent(params.id);

  if (!event) {
    return {
      title: "Event Not Found | VibeCheck Space",
      description: "The requested local event could not be found on VibeCheck Space.",
    };
  }

  const city = event.city || "Vizag";
  const formattedDate = new Date(event.date_time).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = new Date(event.date_time).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const title = `${event.title} - ${event.category || "Local"} Event in ${city}`;
  const description = `${event.description ? event.description.substring(0, 160) : ""}... Date: ${formattedDate} at ${timeStr}. Venue: ${event.venue || event.location || city}. Find passes on VibeCheck Space.`;
  const url = `${SITE_URL}/event/${params.id}`;
  const ogImage = event.image_url || `${SITE_URL}/apple-touch-icon.png`;

  return {
    title,
    description,
    keywords: [
      event.title,
      event.category || "Events",
      city,
      `events in ${city}`,
      `things to do in ${city}`,
      "local events",
      "weekend events",
      event.venue || event.location || "local venue",
      "VibeCheck Space",
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: isProductionEnvironment()
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noarchive: true,
          },
        },
  };
}

export default async function EventPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEvent(params.id);

  const eventJsonLd = event
    ? generateEventJsonLd({
        id: event.id,
        title: event.title,
        description: event.description || "",
        category: event.category,
        dateTime: event.date_time,
        endTime: event.end_time,
        venue: event.venue || event.location,
        location: event.location,
        city: event.city || "Vizag",
        imageUrl: event.image_url,
        isPaid: event.is_paid,
        ticketPrice: event.ticket_price,
        organizerName: event.organizer_name,
        status: event.status,
      })
    : null;

  return (
    <>
      {eventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      )}
      <EventDetailsClient initialEvent={event} eventId={params.id} />
    </>
  );
}
