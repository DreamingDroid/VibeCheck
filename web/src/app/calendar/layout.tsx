import { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "VibeCalendar | Upcoming Local Events & Schedule in Vizag",
  description: "Browse the complete calendar of upcoming local events, concerts, exhibitions, workshops, and community meetups in Vizag.",
  keywords: [
    "event calendar",
    "Vizag event calendar",
    "upcoming events",
    "weekend events Vizag",
    "things to do this weekend",
    "schedule of events Vizag",
    "VibeCheck Space",
  ],
  alternates: {
    canonical: `${SITE_URL}/calendar`,
  },
  openGraph: {
    title: "VibeCalendar | Upcoming Local Events Schedule",
    description: "Browse the complete calendar of upcoming local events, concerts, and workshops in Vizag.",
    url: `${SITE_URL}/calendar`,
    siteName: SITE_NAME,
  },
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
