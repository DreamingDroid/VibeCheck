import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL, SITE_NAME, isProductionEnvironment } from "@/lib/seo";
import { OrganizerProfileClient } from "./OrganizerProfileClient";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const PRIVATE_BACKEND_TOKEN = process.env.PRIVATE_BACKEND_TOKEN || "";

async function getOrganizerData(identifier: string) {
  try {
    const headers: Record<string, string> = {};
    if (PRIVATE_BACKEND_TOKEN) {
      headers["Authorization"] = `Bearer ${PRIVATE_BACKEND_TOKEN}`;
    }
    const res = await fetch(`${BACKEND_URL}/api/organizers/${encodeURIComponent(identifier)}`, {
      headers,
      next: { revalidate: 30 }, // Revalidate every 30 seconds
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error("[OrganizerSSR] Error fetching organizer:", err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const data = await getOrganizerData(params.id);

  if (!data || !data.organizer) {
    return {
      title: "Organizer Profile | VibeCheck Space",
      description: "Discover curated events, community vibes, and exclusive passes on VibeCheck Space.",
    };
  }

  const organizer = data.organizer;
  const brandName = organizer.brand_name || "VibeCheck Organizer";
  const city = organizer.primary_city ? `in ${organizer.primary_city}` : "";
  const title = `${brandName} - Events & Live Experiences ${city} | VibeCheck`;
  const description = organizer.description
    ? `${organizer.description.substring(0, 160)}...`
    : `Explore upcoming events, gatherings, and passes hosted by ${brandName} on VibeCheck Space.`;
  const url = `${SITE_URL}/organizer/${params.id}`;
  const ogImage = organizer.image_url || `${SITE_URL}/apple-touch-icon.png`;

  return {
    title,
    description,
    keywords: [
      brandName,
      "Event Organizer",
      "VibeCheck Host",
      organizer.primary_city || "Live Events",
      "Event Tickets",
      "Parties & Gatherings",
      "Nightlife",
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
      type: "profile",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: brandName,
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
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function OrganizerPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getOrganizerData(params.id);

  if (!data || !data.organizer) {
    // Return friendly error / not found fallback
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background text-foreground">
        <div className="ringer-card p-10 max-w-md w-full rounded-[40px] space-y-4 border border-black/10">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-2xl mx-auto">
            ?
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tight text-black">
            Organizer Not Found
          </h1>
          <p className="text-xs font-semibold text-zinc-500">
            The organizer profile you are looking for does not exist or has not published public events yet.
          </p>
          <a
            href="/dashboard"
            className="inline-block ringer-button bg-black text-white font-black text-xs uppercase px-6 py-3"
          >
            Explore All Events
          </a>
        </div>
      </div>
    );
  }

  return (
    <OrganizerProfileClient
      initialOrganizer={data.organizer}
      initialEvents={data.events || []}
      initialIsFollowing={Boolean(data.isFollowing)}
      identifier={params.id}
    />
  );
}
