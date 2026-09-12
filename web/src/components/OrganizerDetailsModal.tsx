"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Users, 
  Star, 
  Sparkles, 
  ShieldCheck, 
  UserPlus, 
  UserCheck, 
  Share2, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  X, 
  Globe, 
  MapPin,
  CalendarCheck2
} from "lucide-react";
import { toast } from "sonner";

interface OrganizerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  userEmail?: string | null;
  userImage?: string | null;
}

export function OrganizerDetailsModal({
  isOpen,
  onClose,
  event,
  userEmail,
  userImage,
}: OrganizerDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(
    event?.organizer_followers_count || 0
  );

  const organizerName = event?.organizer_name || "VibeCheck Organizer";
  const organizerEmail = event?.organizer_email;
  const organizerImage = event?.organizer_image;
  const organizerDescription = event?.organizer_description;
  const organizerRating = event?.organizer_rating ? Number(event.organizer_rating) : null;
  const hasRating = organizerRating !== null && organizerRating > 0;
  const eventsCount = event?.organizer_events_count || 1;
  const socialLinks = event?.organizer_social_links || {};

  // Determine avatar image: organizer_image from DB (admins / web_users), or user's Google image if they are the organizer
  const displayImage = organizerImage || (userEmail && organizerEmail === userEmail ? userImage : null);

  // Reset image error state when modal opens or image changes
  useEffect(() => {
    setAvatarImgError(false);
  }, [isOpen, displayImage]);

  // Sync followers count when event changes
  useEffect(() => {
    if (event?.organizer_followers_count !== undefined) {
      setFollowersCount(Number(event.organizer_followers_count) || 0);
    }
  }, [event?.organizer_followers_count]);

  // Check if current user is following this organizer
  useEffect(() => {
    if (!isOpen || !userEmail || !organizerEmail) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/followers/user/${encodeURIComponent(userEmail)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setIsFollowing(data.data.includes(organizerEmail));
        }
      })
      .catch((err) => console.error("Error checking follower status:", err));
  }, [isOpen, userEmail, organizerEmail]);

  const handleToggleFollow = async () => {
    if (!userEmail) {
      toast.error("Please sign in to follow this organizer");
      return;
    }

    if (!organizerEmail) {
      toast.error("Organizer contact not available for following");
      return;
    }

    setIsFollowLoading(true);
    const nextFollowingState = !isFollowing;
    const method = isFollowing ? "DELETE" : "POST";
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    // Optimistic update
    setIsFollowing(nextFollowingState);
    setFollowersCount((prev) => Math.max(0, prev + (nextFollowingState ? 1 : -1)));

    try {
      const res = await fetch(`${baseUrl}/api/followers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, organizerEmail }),
      });
      const data = await res.json();

      if (data.success) {
        if (nextFollowingState) {
          toast.success(`You are now following ${organizerName}! 🎉`);
        } else {
          toast.info(`Unfollowed ${organizerName}`);
        }
      } else {
        // Revert on failure
        setIsFollowing(!nextFollowingState);
        setFollowersCount((prev) => Math.max(0, prev + (!nextFollowingState ? 1 : -1)));
        toast.error(data.error || "Failed to update follow status");
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      setIsFollowing(!nextFollowingState);
      setFollowersCount((prev) => Math.max(0, prev + (!nextFollowingState ? 1 : -1)));
      toast.error("Network error while following organizer");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleShareOrganizer = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareText = `Check out ${organizerName} on VibeCheck!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: organizerName,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if dismissed or unsupported
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Organizer link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md w-[92vw] sm:w-full rounded-[32px] p-0 border border-emerald-100 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col bg-white text-zinc-900 animate-in zoom-in-95 duration-200 relative"
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 p-2 rounded-full bg-black/20 hover:bg-black/35 backdrop-blur-md text-white transition-all cursor-pointer active:scale-95 shadow-sm"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable Container (Banner + Body unified) */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Hero Header Banner - Lively Emerald / Teal Gradient */}
          <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-6 pt-6 pb-12 overflow-hidden h-24">
            {/* Vibrant Ambient Glow Orbs */}
            <div className="absolute -right-6 -top-6 w-40 h-40 bg-yellow-300/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-36 h-36 bg-emerald-300/30 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Body Content */}
          <div className="px-6 pb-8 pt-0 space-y-5">
            {/* Avatar & Main Identity */}
            <div className="flex flex-col items-center text-center -mt-12 relative z-20">
              <div className="relative group">
                {displayImage && !avatarImgError ? (
                  <img
                    src={displayImage}
                    alt={organizerName}
                    onError={() => setAvatarImgError(true)}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-xl bg-zinc-100 ring-4 ring-emerald-500/20"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white border-4 border-white shadow-xl ring-4 ring-emerald-500/20 flex items-center justify-center font-black text-3xl italic">
                    {organizerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full shadow-md ring-2 ring-white"
                  title="Verified Host on VibeCheck"
                >
                  <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <h3 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-zinc-900 leading-tight">
                  {organizerName}
                </h3>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{event?.city ? `${event.city} Scene` : "Community Host"}</span>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Host
                  </span>
                </div>
              </div>
            </div>

            {/* Key Stats Matrix (Dynamic 2 or 3 Columns based on rating presence) */}
            <div className={`grid ${hasRating ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-cyan-50/40 border border-emerald-100/70 text-center shadow-xs`}>
              <div className="space-y-0.5">
                <div className="text-lg sm:text-xl font-black text-emerald-950 flex items-center justify-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>{followersCount}</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700/80">
                  Followers
                </div>
              </div>

              <div className={`space-y-0.5 ${hasRating ? 'border-x border-emerald-200/50' : 'border-l border-emerald-200/50'}`}>
                <div className="text-lg sm:text-xl font-black text-teal-950 flex items-center justify-center gap-1.5">
                  <CalendarCheck2 className="h-4 w-4 text-teal-600" />
                  <span>{eventsCount}</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-teal-700/80">
                  Vibes Hosted
                </div>
              </div>

              {hasRating && (
                <div className="space-y-0.5">
                  <div className="text-lg sm:text-xl font-black text-amber-950 flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    <span>{organizerRating.toFixed(1)}</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-700/80">
                    Host Rating
                  </div>
                </div>
              )}
            </div>

            {/* Follow & Action Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFollow}
                disabled={isFollowLoading}
                className={`flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-md ${
                  isFollowing
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>Following Host</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Follow Organizer</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareOrganizer}
                title="Share Host Profile"
                className="h-12 w-12 rounded-2xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/70 flex items-center justify-center transition-all active:scale-95 text-emerald-700 cursor-pointer shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </button>

              {event?.whatsapp_group_link && (
                <a
                  href={event.whatsapp_group_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Join Organizer WhatsApp Group"
                  className="h-12 w-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* About Organizer / Bio Section */}
            <div className="bg-gradient-to-br from-zinc-50 to-emerald-50/30 border border-emerald-100/70 rounded-2xl p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>About The Organizer</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Host Bio
                </span>
              </div>

              {organizerDescription ? (
                <p className="text-xs sm:text-sm font-semibold text-zinc-700 leading-relaxed text-left whitespace-pre-line">
                  {organizerDescription}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-600 leading-relaxed text-left">
                    Curating unforgettable vibes, bringing communities together, and hosting vibrant experiences on VibeCheck. Follow to get notified of upcoming gatherings!
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700/80 italic">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    <span>Full host bio &amp; story coming soon</span>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links if available */}
            {(socialLinks.instagram || socialLinks.website || socialLinks.twitter || socialLinks.facebook) && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                  Connect &amp; Socials
                </div>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram.startsWith("http") ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200/60 text-xs font-black uppercase tracking-wider transition-all shadow-2xs"
                    >
                      <span>Instagram</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialLinks.website && (
                    <a
                      href={socialLinks.website.startsWith("http") ? socialLinks.website : `https://${socialLinks.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/60 text-xs font-black uppercase tracking-wider transition-all shadow-2xs"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter.startsWith("http") ? socialLinks.twitter : `https://twitter.com/${socialLinks.twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/60 text-xs font-black uppercase tracking-wider transition-all shadow-2xs"
                    >
                      <span>Twitter / X</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Currently Hosting Event Footer Strip */}
            {event?.title && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/60 flex items-center justify-between gap-3 text-left shadow-xs">
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Currently Hosting</span>
                  </div>
                  <div className="text-xs font-black text-zinc-900 truncate">
                    {event.title}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shrink-0 shadow-xs">
                  {event.category || "Event"}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
