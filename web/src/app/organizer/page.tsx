"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { VibeTimePicker } from "@/components/vibe-time-picker";

const CATEGORIES = ["Live Music", "DJ Set", "Comedy", "Art & Culture", "Tech Meetup", "Wellness", "Food & Drink", "Sports"];

const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const ampm = hour < 12 ? "AM" : "PM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${min} ${ampm}`;
});

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

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <span className="sticker-badge bg-primary/10 text-primary border-primary/20">Approved</span>;
      case 'rejected': return <span className="sticker-badge bg-destructive/10 text-destructive border-destructive/20">Rejected</span>;
      default: return <span className="sticker-badge bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</span>;
    }
  };

  return (
    <div className="ringer-card overflow-hidden group mb-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center p-6 bg-white cursor-pointer hover:bg-zinc-50 transition-colors gap-4" onClick={() => loadRsvps()}>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="text-black font-black uppercase tracking-tighter italic text-xl">{title}</span>
            {getStatusBadge(status)}
          </div>
          <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {status === 'approved' && (
             <button onClick={openBroadcast} className="ringer-button bg-primary text-black text-[10px] flex items-center gap-2">
               📢 WHATSAPP UPDATE
             </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); loadRsvps(); }} className="ringer-button border border-black/5 hover:bg-black/5 text-black text-[10px]">
            {open ? "HIDE GUESTLIST" : "VIEW GUESTLIST"}
          </button>
        </div>
      </div>
      {open && (
        <div className="p-0 border-t border-black/5 bg-zinc-50/50">
          {loading ? (
             <p className="p-8 text-zinc-400 text-xs font-black uppercase tracking-[0.2em] text-center animate-pulse">Gathering the crowd...</p>
          ) : rsvps.length === 0 ? (
             <p className="p-8 text-zinc-400 text-xs font-bold text-center italic">The vibes are quiet. No RSVPs received yet.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {rsvps.map((r, i) => (
                <li key={i} className="text-sm p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-white transition-colors">
                  <span className="text-black font-bold">
                    {r.name || 'Anonymous Guest'}
                  </span>
                  <span className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {broadcastOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
             <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2">Sync the Vibe</h3>
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-8">Direct WhatsApp update to your community</p>
             
             {broadcastStats ? (
               <div className="bg-zinc-50 border border-black/5 p-6 rounded-[24px] mb-8">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Attendees</span> 
                   <span className="font-black text-black">{broadcastStats.eligibleCount}</span>
                 </div>
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Unit Cost</span> 
                   <span className="font-black text-black">₹{broadcastStats.costPerMessage}</span>
                 </div>
                 <div className="flex justify-between items-center pt-4 border-t border-black/5">
                   <span className="text-[11px] font-black uppercase tracking-widest text-black">Total Investment</span> 
                   <span className="font-black text-primary text-xl">₹{broadcastStats.totalCost}</span>
                 </div>
               </div>
             ) : (
               <div className="p-8 mb-8 text-[10px] font-black uppercase tracking-widest text-zinc-300 text-center animate-pulse bg-zinc-50 rounded-[24px] border border-black/5">Calculating stats...</div>
             )}
             
             <Textarea 
               placeholder="Write your update here..." 
               className="bg-zinc-50 border-black/5 text-black mb-8 min-h-[120px] rounded-[20px] p-4 text-xs font-bold focus:ring-primary"
               value={broadcastMessage}
               onChange={e => setBroadcastMessage(e.target.value)}
             />
             
             {paymentStatus === "processing" ? (
               <div className="ringer-button w-full bg-accent text-black text-center animate-pulse flex justify-center items-center gap-2">
                 💳 Processing...
               </div>
             ) : broadcasting ? (
               <div className="ringer-button w-full bg-primary text-black text-center animate-pulse flex justify-center items-center gap-2">
                 📲 Sending...
               </div>
             ) : (
                <div className="flex gap-4">
                  <button className="ringer-button flex-1 border border-black/5 hover:bg-black/5 text-black" onClick={() => setBroadcastOpen(false)}>CANCEL</button>
                  <button 
                    className="ringer-button flex-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-30" 
                    onClick={handlePayAndSend}
                    disabled={!broadcastStats || broadcastStats.eligibleCount === 0 || !broadcastMessage.trim()}
                  >
                    PAY & SEND
                  </button>
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

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    title: "", description: "", category: "", location: "", timings: "",
    startDate: "", endDate: "", startTime: "08:00 PM", endTime: "11:00 PM"
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
    
    // Validate
    const newErrors: Record<string, boolean> = {};
    if (!formData.title) newErrors.title = true;
    if (!formData.startDate) newErrors.startDate = true;
    if (isMultiDay && !formData.endDate) newErrors.endDate = true;
    if (!formData.category) newErrors.category = true;
    if (!formData.location) newErrors.location = true;
    if (!formData.description) newErrors.description = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Optional: smooth scroll to first error
      const firstError = Object.keys(newErrors)[0];
      const el = document.getElementsByName(firstError)[0];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    setErrors({});
    // Combine date and time
    const combine = (date: string, timeStr: string) => {
      const [time, ampm] = timeStr.split(" ");
      let [hours, mins] = time.split(":").map(Number);
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      const d = new Date(date);
      d.setHours(hours, mins, 0, 0);
      return d.toISOString();
    };

    const start_iso = combine(formData.startDate, formData.startTime);
    const end_iso = combine(isMultiDay ? formData.endDate : formData.startDate, formData.endTime);

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:4000/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          date_time: start_iso, 
          end_time: end_iso,
          organizer_email: session?.user?.email 
        })
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ 
          title: "", description: "", category: "", location: "", timings: "",
          startDate: "", endDate: "", startTime: "08:00 PM", endTime: "11:00 PM"
        });
        setIsMultiDay(false);
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
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Vibes...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-black p-4 sm:p-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-12 mt-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-black/5 pb-12 gap-8">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
              The Control Room
            </h1>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Deploy and manage your local vibes</p>
          </div>
          <Link href="/dashboard">
            <button className="ringer-button border border-black/5 hover:bg-black/5 text-black text-[10px]">
              EXIT TO PORTAL
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Submission Form */}
          <div className="lg:col-span-4 h-fit">
            <div className="ringer-card overflow-hidden">
              <div className="bg-primary/5 border-b border-black/5 p-6">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-black">NEW EVENT</h2>
                <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase">Awaiting platform guardian approval</p>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Input name="title" placeholder="Event Title" value={formData.title} onChange={e=>{setFormData({...formData, title: e.target.value}); if(errors.title) setErrors({...errors, title: false})}} className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.title && "border-red-500 ring-red-500/20")} />
                    {errors.title && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Title is required</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <Select value={formData.category} onValueChange={v => {setFormData({...formData, category: v || ""}); if(errors.category) setErrors({...errors, category: false})}}>
                      <SelectTrigger className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.category && "border-red-500 ring-red-500/20")}>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-black/5 rounded-[20px] shadow-2xl p-2">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Pick a category</p>}
                  </div>

                  {/* Single vs Multi Day Switcher */}
                  <div className="flex bg-zinc-50 p-1 rounded-xl border border-black/5">
                    <button 
                      type="button"
                      onClick={() => setIsMultiDay(false)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isMultiDay ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'}`}
                    >
                      Single Day
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsMultiDay(true)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isMultiDay ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'}`}
                    >
                      Multi Day
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">{isMultiDay ? "From Date" : "Date"}</label>
                      <Input name="startDate" type="date" value={formData.startDate} onChange={e=>{setFormData({...formData, startDate: e.target.value}); if(errors.startDate) setErrors({...errors, startDate: false})}} className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.startDate && "border-red-500 ring-red-500/20")} />
                    </div>
                    {isMultiDay && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">To Date</label>
                        <Input name="endDate" type="date" value={formData.endDate} onChange={e=>{setFormData({...formData, endDate: e.target.value}); if(errors.endDate) setErrors({...errors, endDate: false})}} className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.endDate && "border-red-500 ring-red-500/20")} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <VibeTimePicker 
                      label="Begins At"
                      value={formData.startTime}
                      onChange={v => setFormData({...formData, startTime: v})}
                    />
                    <VibeTimePicker 
                      label="Ends At"
                      value={formData.endTime}
                      onChange={v => setFormData({...formData, endTime: v})}
                    />
                  </div>
                  
                  <Input placeholder="Extra Timings Note (Optional)" value={formData.timings} onChange={e=>setFormData({...formData, timings: e.target.value})} className="bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold" />

                  <div className="space-y-1">
                    <Input name="location" placeholder="Location (e.g. Rushikonda Beach)" value={formData.location} onChange={e=>{setFormData({...formData, location: e.target.value}); if(errors.location) setErrors({...errors, location: false})}} className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.location && "border-red-500 ring-red-500/20")} />
                    {errors.location && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Location coordinate required</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <Textarea name="description" placeholder="Vibe Manifest (Description)..." value={formData.description} onChange={e=>{setFormData({...formData, description: e.target.value}); if(errors.description) setErrors({...errors, description: false})}} className={cn("bg-zinc-50 border-black/5 focus:ring-primary min-h-[140px] rounded-[24px] p-4 text-xs font-bold", errors.description && "border-red-500 ring-red-500/20")} />
                    {errors.description && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Vibe manifest is empty</p>}
                  </div>
                </div>
                
                <button type="submit" disabled={submitting} className="ringer-button w-full bg-black text-white hover:bg-zinc-800 text-[11px]">
                  {submitting ? "DEPLOYING..." : "SUBMIT FOR REVIEW"}
                </button>
              </form>
            </div>
          </div>

          {/* My Events */}
          <div className="lg:col-span-8 space-y-8">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Deployment Log</h2>
            {myEvents.length === 0 ? (
              <div className="text-center py-20 text-zinc-300 ringer-card border-dashed">
                <p className="text-[10px] font-black uppercase tracking-widest">No active vibes detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
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
