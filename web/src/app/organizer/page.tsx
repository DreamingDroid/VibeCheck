"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

const CATEGORIES = ["Live Music", "DJ Set", "Comedy", "Art & Culture", "Tech Meetup", "Wellness", "Food & Drink", "Sports"];

function EventRsvpList({ eventId, title, status, dateStr, organizerEmail }: { eventId: string, title: string, status: string, dateStr: string, organizerEmail: string }) {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastStats, setBroadcastStats] = useState<{eligibleCount: number, costPerMessage: number, totalCost: number} | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success">("idle");

  const loadRsvps = () => {
    if (!open) {
      setLoading(true);
      fetch(`http://localhost:4000/api/organizer/events/${eventId}/rsvps?email=${encodeURIComponent(organizerEmail)}`)
        .then(r => r.json())
        .then(d => { if (d.success) setRsvps(d.data); })
        .finally(() => setLoading(false));
    }
    setOpen(!open);
  };

  const openBroadcast = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBroadcastOpen(true);
    fetch(`http://localhost:4000/api/organizer/events/${eventId}/broadcast-stats?email=${encodeURIComponent(organizerEmail)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
           setBroadcastStats(d);
        }
      });
  };

  const handlePayAndSend = () => {
    if (!broadcastMessage.trim()) return alert("Message cannot be empty.");
    setPaymentStatus("processing");
    setTimeout(() => {
       setPaymentStatus("success");
       setBroadcasting(true);
       fetch(`http://localhost:4000/api/organizer/events/${eventId}/broadcast`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ organizer_email: organizerEmail, message: broadcastMessage })
       })
       .then(r => r.json())
       .then(d => {
         if (d.success) {
           alert(d.message);
           setBroadcastOpen(false);
         } else {
           alert("Broadcast failed.");
         }
       })
       .finally(() => {
         setBroadcasting(false);
         setPaymentStatus("idle");
         setBroadcastMessage("");
       });
    }, 2000);
  };

  return (
    <div className="border border-zinc-800 rounded-lg mb-3 overflow-hidden group">
      <div className="flex flex-col md:flex-row justify-between md:items-center p-4 bg-zinc-900/50 cursor-pointer hover:bg-zinc-800 transition-colors gap-4" onClick={() => loadRsvps()}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-base">{title}</span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>{status}</span>
          </div>
          <span className="text-zinc-500 text-xs mt-1">{new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
        </div>
        <div className="flex gap-2 items-center">
          {status === 'approved' && (
             <button onClick={openBroadcast} className="text-emerald-400 text-sm font-medium px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
               📢 WhatsApp Update
             </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); loadRsvps(); }} className="text-indigo-400 text-sm font-medium px-4 py-2 w-fit bg-indigo-500/10 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
            {open ? "Hide Guestlist" : "View Guestlist"}
          </button>
        </div>
      </div>
      {open && (
        <div className="p-0 border-t border-zinc-800 bg-zinc-950">
          {loading ? (
             <p className="p-6 text-zinc-500 text-sm text-center animate-pulse">Loading attendees...</p>
          ) : rsvps.length === 0 ? (
             <p className="p-6 text-zinc-500 text-sm text-center italic">No RSVPs received yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/50">
              {rsvps.map((r, i) => (
                <li key={i} className="text-sm p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-zinc-900/30 transition-colors">
                  <span className="text-zinc-300 font-medium">
                    {r.name || 'Anonymous Guest'}
                  </span>
                  <span className="text-zinc-600 text-xs">{new Date(r.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {broadcastOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
             <h3 className="text-xl font-bold text-white mb-2">Broadcast WhatsApp Update</h3>
             <p className="text-sm text-zinc-400 mb-4">Send a direct WhatsApp message to your attendees.</p>
             
             {broadcastStats ? (
               <div className="bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-lg mb-4 text-sm text-zinc-300">
                 <div className="flex justify-between mb-1"><span>Eligible Attendees:</span> <span className="font-bold text-white">{broadcastStats.eligibleCount}</span></div>
                 <div className="flex justify-between mb-1"><span>Cost per message:</span> <span className="font-bold text-white">₹{broadcastStats.costPerMessage}</span></div>
                 <div className="flex justify-between mt-2 pt-2 border-t border-indigo-500/20"><span>Total Cost:</span> <span className="font-bold text-indigo-400 text-lg">₹{broadcastStats.totalCost}</span></div>
               </div>
             ) : (
               <div className="p-4 mb-4 text-sm text-zinc-500 text-center animate-pulse border border-zinc-800/50 rounded-lg">Calculating stats...</div>
             )}
             
             <Textarea 
               placeholder="Write your update here..." 
               className="bg-zinc-950 border-zinc-800 text-white mb-4 min-h-[100px]"
               value={broadcastMessage}
               onChange={e => setBroadcastMessage(e.target.value)}
             />
             
             {paymentStatus === "processing" ? (
               <div className="w-full py-2 bg-amber-600/50 text-white rounded-md text-center animate-pulse flex justify-center items-center gap-2">
                 💳 Processing Payment...
               </div>
             ) : broadcasting ? (
               <div className="w-full py-2 bg-indigo-600/50 text-white rounded-md text-center animate-pulse flex justify-center items-center gap-2">
                 📲 Sending Messages...
               </div>
             ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50" 
                    onClick={handlePayAndSend}
                    disabled={!broadcastStats || broadcastStats.eligibleCount === 0 || !broadcastMessage.trim()}
                  >
                    Pay & Send
                  </Button>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [myEvents, setMyEvents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "", description: "", category: "", location: "", date_time: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) {
       router.push("/dashboard");
       return;
    }

    fetch(`http://localhost:4000/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success || (!data.isOrganizer && !data.isAdmin)) {
          router.push("/dashboard");
          return;
        }
        setIsOrganizer(true);
        loadMyEvents();
      })
      .catch(err => {
        console.error("Check role error", err);
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));

  }, [session, router]);

  const loadMyEvents = () => {
    fetch(`http://localhost:4000/api/organizer/events?email=${encodeURIComponent(session!.user!.email!)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setMyEvents(data.data);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date_time || !formData.category) return alert("Fill required fields");
    
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:4000/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, organizer_email: session?.user?.email })
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ title: "", description: "", category: "", location: "", date_time: "" });
        loadMyEvents();
        alert("Event submitted successfully and is pending review!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit event");
    }
    setSubmitting(false);
  };

  if (loading || !isOrganizer) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Verifying Organizer Status...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto space-y-8 mt-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-800 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Organizer Hub
            </h1>
            <p className="text-zinc-400 mt-2">Submit and manage your local events.</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm">
              🔙 Exit to Portal
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submission Form */}
          <div className="lg:col-span-1 border border-zinc-800 bg-zinc-900 rounded-xl overflow-hidden shadow-2xl h-fit">
            <div className="bg-indigo-600/10 border-b border-indigo-500/20 p-4">
              <h2 className="text-lg font-bold text-indigo-400">Submit New Event</h2>
              <p className="text-xs text-zinc-400 mt-1">Requires admin approval before going live.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <Input placeholder="Event Title" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="bg-zinc-950 border-zinc-800" required />
              
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v || ""})}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:ring-indigo-500">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input type="datetime-local" value={formData.date_time} onChange={e=>setFormData({...formData, date_time: e.target.value})} className="bg-zinc-950 border-zinc-800" required />
              
              <Input placeholder="Location (e.g. Rushikonda Beach)" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="bg-zinc-950 border-zinc-800" required />
              
              <Textarea placeholder="Event Description..." value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="bg-zinc-950 border-zinc-800 min-h-[120px]" required />
              
              <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            </form>
          </div>

          {/* My Events */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-3">My Events & RSVPs</h2>
            {myEvents.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                <p>You haven't submitted any events yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myEvents.map(ev => (
                  <EventRsvpList key={ev.id} eventId={ev.id} title={ev.title} status={ev.status} dateStr={ev.date_time} organizerEmail={session?.user?.email || ""} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
