"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function EventFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    const fetchDetails = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        
        // Fetch event details (allowing archived events)
        const eventRes = await fetch(`${baseUrl}/api/events/${params.id}/feedback-detail`);
        const eventData = await eventRes.json();
        
        if (eventData.success) {
          setEvent(eventData.data);
          
          // If session email is present, check if user has already submitted feedback
          if (session?.user?.email) {
            const checkRes = await fetch(
              `${baseUrl}/api/events/${params.id}/feedback/check?email=${encodeURIComponent(session.user.email)}`
            );
            const checkData = await checkRes.json();
            if (checkData.success && checkData.submitted) {
              setAlreadySubmitted(true);
            }
          }
        } else {
          toast.error("Event not found.");
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Error loading feedback details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchDetails();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [params.id, status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email || !params.id) return;
    
    if (rating === 0) {
      toast.error("Please select a rating of at least 1 star!");
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/events/${params.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          rating,
          feedback: feedbackText.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        toast.success("Feedback submitted! Thanks for sharing the vibe.");
      } else {
        toast.error(data.error || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">
        Loading Feedback Portal...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full ringer-card p-10 bg-white text-center space-y-8 shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
          <div className="sticker-badge bg-primary text-white w-fit mx-auto border-none shadow-sm font-black text-[9px] uppercase tracking-widest">
            VibeCheck Feedback
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            Identity Locked
          </h2>
          <p className="text-zinc-500 font-bold text-xs leading-relaxed">
            Please sign in to verify your attendance and submit your feedback/rating.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: window.location.href })}
            className="ringer-button w-full bg-black text-white hover:bg-zinc-800 h-14 text-xs font-black tracking-widest flex items-center justify-center gap-2"
          >
            🔑 SIGN IN TO LEAVE FEEDBACK
          </button>
        </div>
      </div>
    );
  }

  if (!event) return null;

  if (success || alreadySubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="max-w-md w-full ringer-card p-10 bg-white text-center space-y-8 shadow-2xl border border-black/5">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto animate-bounce" />
          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            Vibe Recorded
          </h2>
          <p className="text-zinc-500 font-bold text-xs leading-relaxed">
            {success 
              ? "Your feedback was successfully commit-logged. Thanks for helping make Vizag Vibes even better!"
              : "You have already submitted a rating/feedback for this event."}
          </p>
          <Link href="/dashboard" className="block">
            <button className="ringer-button w-full bg-black text-white hover:bg-zinc-800 h-14 text-xs font-black tracking-widest">
              RETURN TO DASHBOARD
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8 animate-in fade-in duration-500">
      <Link href="/dashboard" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Dashboard
      </Link>

      <Card className="ringer-card overflow-hidden shadow-2xl">
        <CardHeader className="bg-zinc-50 border-b border-black/5 p-8">
          <div className="flex gap-2 mb-2">
            <span className="sticker-badge bg-primary text-white border-none">{event.category}</span>
            <span className="sticker-badge bg-zinc-200 border-none text-zinc-500">Completed</span>
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter uppercase italic leading-none">
            {event.title}
          </CardTitle>
          <CardDescription className="text-xs font-bold text-zinc-500 pt-1">
            Let the host know how they did. Your rating shapes Vizag's local scene.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Rating Stars */}
            <div className="space-y-3 text-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                VIBE RATING
              </label>
              <div className="flex justify-center items-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isHighlighted = hoverRating >= star || (!hoverRating && rating >= star);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform active:scale-90 duration-100 focus:outline-none"
                    >
                      <Star 
                        className={`h-10 w-10 transition-colors duration-200 ${
                          isHighlighted 
                            ? "fill-primary text-primary" 
                            : "text-zinc-200 fill-zinc-100"
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-bold text-zinc-600 h-4">
                {rating === 1 && "⚠️ Needs Improvement"}
                {rating === 2 && "👍 Okay Vibe"}
                {rating === 3 && "✨ Good Happenings"}
                {rating === 4 && "🔥 Amazing Event"}
                {rating === 5 && "⭐ Mindblowing Experience!"}
              </div>
            </div>

            {/* Written Comments */}
            <div className="space-y-2">
              <label htmlFor="comments" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 block">
                DETAILED COMMENTS (OPTIONAL)
              </label>
              <textarea
                id="comments"
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What went well? What could be improved?"
                className="w-full bg-zinc-50 border border-black/5 rounded-[20px] p-4 text-sm font-bold placeholder-zinc-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="ringer-button w-full bg-primary text-black hover:bg-primary/90 disabled:opacity-50 h-14 text-xs font-black tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  SUBMIT VIBE CHECK
                </>
              )}
            </button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
