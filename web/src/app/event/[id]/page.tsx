"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvped, setRsvped] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    
    fetch(`http://localhost:4000/api/events/${params.id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setEvent(res.data);
        } else {
          router.push("/dashboard");
        }
      })
      .catch(err => {
        console.error(err);
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleDownloadICS = () => {
    if (!event) return;
    const startDate = new Date(event.date_time);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hour duration
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.title.replace(/\\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRSVP = () => {
    // Just a frontend state change for now
    setRsvped(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 flex justify-center items-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-zinc-800 rounded"></div>
          <div className="h-4 w-32 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-8 mt-10">
        <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 w-fit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Events
        </Link>
        
        <div className="bg-zinc-900 border border-zinc-800 p-8 sm:p-12 rounded-2xl shadow-2xl">
          <Badge variant="outline" className="mb-6 border-indigo-500/30 text-indigo-400 bg-indigo-500/10 font-semibold tracking-wide">
            {event.category}
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">
            {event.title}
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-6 text-zinc-300 font-medium mb-10 border-b border-zinc-800 pb-10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-zinc-800/50">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <span className="text-lg">{new Date(event.date_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-zinc-800/50">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="text-lg">{event.location}</span>
            </div>
          </div>
          
          <div className="prose prose-invert max-w-none text-zinc-400 text-lg leading-relaxed mb-12">
            {event.description}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-zinc-800">
            <Button 
              onClick={handleRSVP}
              disabled={rsvped}
              className={`flex-1 text-base h-14 font-semibold transition-all ${rsvped ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/40'}`}
            >
              {rsvped ? "RSVP Confirmed ✓" : "RSVP to Event"}
            </Button>
            
            <Button 
              onClick={handleDownloadICS}
              variant="outline"
              className="flex-1 text-base h-14 border-zinc-700 hover:bg-zinc-800 text-zinc-300 gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v14m-4-4h8" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v4H3z" /></svg>
              Add to Calendar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
