"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  Sparkles,
  UserPlus,
  UserCheck,
  X,
  CheckCircle2,
  Calendar,
  MapPin,
  Heart,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface EventRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  organizerEmail?: string | null;
  organizerName?: string | null;
  organizerImage?: string | null;
  organizerRating?: number | null;
  userEmail?: string | null;
  onSuccess?: (data?: any) => void;
}

const EVENT_RATING_LABELS: Record<number, string> = {
  1: "1 Star • Poor Vibe",
  2: "2 Stars • Fair",
  3: "3 Stars • Good Experience",
  4: "4 Stars • Great Vibe!",
  5: "5 Stars • Phenomenal Experience! 🔥",
};

const ORGANIZER_RATING_LABELS: Record<number, string> = {
  1: "1 Star • Needs Improvement",
  2: "2 Stars • Average Host",
  3: "3 Stars • Good Host",
  4: "4 Stars • Great Host!",
  5: "5 Stars • Exceptional Host! 🌟",
};

export function EventRatingModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  organizerEmail,
  organizerName: rawOrganizerName,
  organizerImage,
  organizerRating,
  userEmail,
  onSuccess,
}: EventRatingModalProps) {
  const organizerName = rawOrganizerName || "VibeCheck Organizer";
  const [eventRating, setEventRating] = useState<number>(0);
  const [hoverEventRating, setHoverEventRating] = useState<number>(0);

  const [organizerScore, setOrganizerScore] = useState<number>(0);
  const [hoverOrganizerScore, setHoverOrganizerScore] = useState<number>(0);

  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Fetch current user rating & follower status
  useEffect(() => {
    if (!isOpen || !eventId) return;

    setSubmitted(false);
    setLoadingInitial(true);

    // 1. Fetch ratings summary & user rating if available
    const ratingsUrl = userEmail
      ? `${baseUrl}/api/events/${eventId}/ratings?email=${encodeURIComponent(userEmail)}`
      : `${baseUrl}/api/events/${eventId}/ratings`;

    fetch(ratingsUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.userRating) {
            setEventRating(Number(data.data.userRating.event_rating) || 0);
            setOrganizerScore(Number(data.data.userRating.organizer_rating) || 0);
          }
        }
      })
      .catch((err) => console.error("Error fetching rating summary:", err))
      .finally(() => setLoadingInitial(false));

    // 2. Fetch following status
    if (userEmail && organizerEmail) {
      fetch(`${baseUrl}/api/followers/user/${encodeURIComponent(userEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setIsFollowing(data.data.includes(organizerEmail));
          }
        })
        .catch((err) => console.error("Error fetching following status:", err));
    }
  }, [isOpen, eventId, userEmail, organizerEmail, baseUrl]);

  const handleToggleFollow = async () => {
    if (!userEmail) {
      toast.error("Please sign in to follow the organizer");
      return;
    }

    if (!organizerEmail) {
      toast.error("Organizer details not available for follow");
      return;
    }

    setFollowLoading(true);
    const nextState = !isFollowing;
    const method = isFollowing ? "DELETE" : "POST";

    // Optimistic UI update
    setIsFollowing(nextState);
    setFollowersCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      const res = await fetch(`${baseUrl}/api/followers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, organizerEmail }),
      });
      const data = await res.json();

      if (data.success) {
        if (nextState) {
          toast.success(`You are now following ${organizerName}! 🎉`);
        } else {
          toast.info(`Unfollowed ${organizerName}`);
        }
      } else {
        // Revert on failure
        setIsFollowing(!nextState);
        setFollowersCount((prev) => Math.max(0, prev + (!nextState ? 1 : -1)));
        toast.error(data.error || "Failed to update follow status");
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      setIsFollowing(!nextState);
      setFollowersCount((prev) => Math.max(0, prev + (!nextState ? 1 : -1)));
      toast.error("Network error while following organizer");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userEmail) {
      toast.error("Please sign in to submit your rating.");
      return;
    }

    if (eventRating === 0) {
      toast.error("Please select a star rating for the event.");
      return;
    }

    if (organizerScore === 0) {
      toast.error("Please select a star rating for the host.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/events/${eventId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          eventRating,
          organizerRating: organizerScore,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        toast.success("Thank you! Your ratings have been recorded 🎉");
        if (onSuccess) onSuccess(data.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        toast.error(data.error || "Failed to submit ratings.");
      }
    } catch (err) {
      console.error("Error submitting ratings:", err);
      toast.error("An error occurred while submitting ratings.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-[36px] overflow-hidden shadow-2xl border-4 border-amber-400 ring-4 ring-amber-400/20 animate-in zoom-in-95 duration-200 text-left">
        {/* Modal Header */}
        <div className="p-6 sm:p-7 border-b border-amber-200 bg-gradient-to-br from-amber-500/20 via-amber-50 to-white flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0 pr-2">
            <div className="p-3.5 rounded-2xl shrink-0 flex items-center justify-center text-3xl shadow-sm border border-amber-300 bg-amber-100/90 text-amber-700 animate-bounce">
              <span>⭐</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="sticker-badge text-[9px] font-black uppercase py-0.5 px-2.5 bg-amber-500 text-black border-none shadow-xs">
                  Event Rating &amp; Feedback
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight mt-1.5 leading-tight text-black break-words">
                {eventTitle || "Rate Your Experience"}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 text-zinc-400 hover:text-black transition-colors shrink-0 -mt-1 -mr-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-emerald-300 shadow-lg animate-in zoom-in">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-2xl font-black italic uppercase tracking-tight text-black">
                Ratings Recorded!
              </h4>
              <p className="text-sm font-medium text-zinc-600 max-w-sm mx-auto">
                Thank you for supporting the creator and sharing your experience with the VibeCheck community!
              </p>
            </div>
          ) : (
            <>
              {/* Event Details Card */}
              {(eventDate || eventLocation) && (
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-black/5 text-xs text-zinc-600 font-bold">
                  {eventDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{new Date(eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {eventLocation && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="truncate max-w-[200px]">{eventLocation}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 1. Rate Event Section */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-zinc-50/50 border border-amber-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 1. Rate The Event
                  </span>
                  <span className="text-xs font-black text-amber-700">
                    {eventRating > 0 ? `${eventRating} / 5` : "Select stars"}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverEventRating || eventRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEventRating(star)}
                        onMouseEnter={() => setHoverEventRating(star)}
                        onMouseLeave={() => setHoverEventRating(0)}
                        className="p-1.5 rounded-2xl transition-all transform hover:scale-125 active:scale-95 focus:outline-none"
                        aria-label={`Rate ${star} star`}
                      >
                        <Star
                          className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                              : "text-zinc-200 hover:text-amber-200"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <p className="text-center text-xs font-black text-amber-800 tracking-wide min-h-[18px]">
                  {hoverEventRating ? EVENT_RATING_LABELS[hoverEventRating] : eventRating ? EVENT_RATING_LABELS[eventRating] : "How was the overall event experience?"}
                </p>
              </div>

              {/* 2. Rate Host & Follow Host Section */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 border border-purple-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-900 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-purple-500" /> 2. Rate &amp; Follow Host
                  </span>
                  <span className="text-xs font-black text-purple-700">
                    {organizerScore > 0 ? `${organizerScore} / 5` : "Select stars"}
                  </span>
                </div>

                {/* Organizer Profile Card & 1-Click Follow Button */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/90 border border-purple-100 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      {organizerImage ? (
                        <img
                          src={organizerImage}
                          alt={organizerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (organizerName?.charAt(0) || "O").toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-black uppercase tracking-tight text-black truncate">
                        {organizerName}
                      </h5>
                      <p className="text-[10px] font-bold text-zinc-400">
                        {organizerRating ? `⭐ ${Number(organizerRating).toFixed(1)} Host Rating` : "Event Host"}
                      </p>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`ringer-button text-[10px] py-1.5 px-3.5 shrink-0 flex items-center gap-1.5 transition-all shadow-xs ${
                      isFollowing
                        ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300"
                        : "bg-purple-600 hover:bg-purple-700 text-white font-black"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        <span>FOLLOWING</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        <span>FOLLOW HOST</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Star Rating for Organizer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverOrganizerScore || organizerScore) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setOrganizerScore(star)}
                          onMouseEnter={() => setHoverOrganizerScore(star)}
                          onMouseLeave={() => setHoverOrganizerScore(0)}
                          className="p-1.5 rounded-2xl transition-all transform hover:scale-125 active:scale-95 focus:outline-none"
                          aria-label={`Rate Host ${star} star`}
                        >
                          <Star
                            className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                              active
                                ? "fill-purple-400 text-purple-500 drop-shadow-[0_2px_8px_rgba(168,85,247,0.4)]"
                                : "text-zinc-200 hover:text-purple-200"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-center text-xs font-black text-purple-800 tracking-wide min-h-[18px]">
                    {hoverOrganizerScore
                      ? ORGANIZER_RATING_LABELS[hoverOrganizerScore]
                      : organizerScore
                      ? ORGANIZER_RATING_LABELS[organizerScore]
                      : "How would you rate the organizer's hosting?"}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto ringer-button border border-black/10 bg-zinc-100 hover:bg-zinc-200 text-black text-xs py-2.5 px-5 transition-colors"
                >
                  DISMISS
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || eventRating === 0 || organizerScore === 0}
                  className="w-full sm:w-auto ringer-button bg-amber-500 hover:bg-amber-600 text-black font-black text-xs py-2.5 px-6 shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  <span>{submitting ? "SUBMITTING..." : "SUBMIT RATINGS ⭐"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
