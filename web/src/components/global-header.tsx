"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSession, signOut, signIn } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useCity } from "@/context/CityContext"
import {
  ChevronDown, MapPin, Search, Music, Mic2, Tv,
  Trophy, Palette, BookOpen, Compass, Heart,
  Activity, Wine, Smile, Briefcase, Sparkles, Bell,
  SunMoon, Menu, X, CheckCircle2, AlertCircle, Clock, ExternalLink, Calendar, User,
  Sliders, LogOut, Shield, Newspaper
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { useLanguage, useTranslation, ALL_LANGUAGES } from "@/context/LanguageContext"
import {
  UserNotification,
  BroadcastType,
  BROADCAST_TYPE_CONFIGS
} from "@/types/broadcast"
import { registerFcmForUser, onForegroundFcmMessage, isFirebaseConfigured } from "@/lib/firebase"
import { toast } from "sonner"

interface ModalNotification {
  type: string;
  badge: string;
  icon?: string;
  title: string;
  message: string;
  reason?: string | null;
  link?: string | null;
  actionText?: string;
  time: string;
}

function getNotificationModalTheme(type: string, customIcon?: string) {
  switch (type) {
    case 'emergency_alert':
      return {
        cardBorder: 'border-red-500 shadow-[0_20px_50px_rgba(239,68,68,0.25)] ring-4 ring-red-500/20',
        headerBg: 'bg-gradient-to-br from-red-500/20 via-red-50 to-white',
        headerBorder: 'border-red-200',
        iconBox: 'bg-red-100/90 text-red-600 border-red-300 ring-2 ring-red-400/30 animate-pulse',
        badgeClass: 'bg-red-600 text-white animate-pulse',
        actionBtnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/25 font-black',
        icon: customIcon || '🚨',
      };
    case 'event_reminder':
      return {
        cardBorder: 'border-amber-500 shadow-[0_20px_50px_rgba(245,158,11,0.2)] ring-4 ring-amber-500/10',
        headerBg: 'bg-gradient-to-br from-amber-500/20 via-amber-50 to-white',
        headerBorder: 'border-amber-200',
        iconBox: 'bg-amber-100/90 text-amber-700 border-amber-300',
        badgeClass: 'bg-amber-500 text-black font-black',
        actionBtnClass: 'bg-amber-500 hover:bg-amber-600 text-black font-black shadow-md shadow-amber-500/20',
        icon: customIcon || '⏰',
      };
    case 'agenda_shift':
      return {
        cardBorder: 'border-orange-500 shadow-[0_20px_50px_rgba(249,115,22,0.2)] ring-4 ring-orange-500/10',
        headerBg: 'bg-gradient-to-br from-orange-500/20 via-orange-50 to-white',
        headerBorder: 'border-orange-200',
        iconBox: 'bg-orange-100/90 text-orange-700 border-orange-300',
        badgeClass: 'bg-orange-500 text-white font-black',
        actionBtnClass: 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20 font-black',
        icon: customIcon || '⏳',
      };
    case 'event_rescheduled':
      return {
        cardBorder: 'border-emerald-500 shadow-[0_20px_50px_rgba(160,185,129,0.2)] ring-4 ring-emerald-500/10',
        headerBg: 'bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-white',
        headerBorder: 'border-emerald-200',
        iconBox: 'bg-emerald-100/90 text-emerald-700 border-emerald-300',
        badgeClass: 'bg-emerald-600 text-white font-black',
        actionBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 font-black',
        icon: customIcon || '📅',
      };
    case 'event_cancellation':
      return {
        cardBorder: 'border-rose-500 shadow-[0_20px_50px_rgba(244,63,94,0.2)] ring-4 ring-rose-500/10',
        headerBg: 'bg-gradient-to-br from-rose-500/20 via-rose-50 to-white',
        headerBorder: 'border-rose-200',
        iconBox: 'bg-rose-100/90 text-rose-700 border-rose-300',
        badgeClass: 'bg-rose-600 text-white font-black',
        actionBtnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 font-black',
        icon: customIcon || '🚫',
      };
    case 'whatsapp_group_invite':
      return {
        cardBorder: 'border-[#25D366] shadow-[0_20px_50px_rgba(37,211,102,0.2)] ring-4 ring-emerald-500/10',
        headerBg: 'bg-gradient-to-br from-[#25D366]/20 via-emerald-50 to-white',
        headerBorder: 'border-emerald-200',
        iconBox: 'bg-emerald-100/90 text-[#25D366] border-emerald-300',
        badgeClass: 'bg-[#25D366] text-white font-black',
        actionBtnClass: 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-md shadow-emerald-500/20 font-bold',
        icon: customIcon || '💬',
      };
    case 'rating_request':
      return {
        cardBorder: 'border-amber-400 shadow-[0_20px_50px_rgba(245,158,11,0.25)] ring-4 ring-amber-400/20',
        headerBg: 'bg-gradient-to-br from-amber-500/20 via-amber-50 to-white',
        headerBorder: 'border-amber-200',
        iconBox: 'bg-amber-100/90 text-amber-700 border-amber-300',
        badgeClass: 'bg-amber-500 text-black font-black',
        actionBtnClass: 'bg-amber-500 hover:bg-amber-600 text-black font-black shadow-md shadow-amber-500/20',
        icon: customIcon || '⭐',
      };
    case 'approval_pending':
    case 'pending':
      return {
        cardBorder: 'border-indigo-500 shadow-[0_20px_50px_rgba(99,102,241,0.2)] ring-4 ring-indigo-500/10',
        headerBg: 'bg-gradient-to-br from-indigo-500/20 via-indigo-50 to-white',
        headerBorder: 'border-indigo-200',
        iconBox: 'bg-indigo-100/90 text-indigo-700 border-indigo-300',
        badgeClass: 'bg-indigo-600 text-white font-black',
        actionBtnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 font-bold',
        icon: customIcon || '📝',
      };
    case 'application_approved':
    case 'approved':
    case 'event_approved':
      return {
        cardBorder: 'border-emerald-500 shadow-[0_20px_50px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/10',
        headerBg: 'bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-white',
        headerBorder: 'border-emerald-200',
        iconBox: 'bg-emerald-100/90 text-emerald-700 border-emerald-300',
        badgeClass: 'bg-emerald-600 text-white font-black',
        actionBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 font-bold',
        icon: customIcon || (type === 'event_approved' ? '🚀' : '🎉'),
      };
    case 'application_rejected':
    case 'rejected':
    case 'event_rejected':
      return {
        cardBorder: 'border-rose-500 shadow-[0_20px_50px_rgba(244,63,94,0.2)] ring-4 ring-rose-500/10',
        headerBg: 'bg-gradient-to-br from-rose-500/20 via-rose-50 to-white',
        headerBorder: 'border-rose-200',
        iconBox: 'bg-rose-100/90 text-rose-700 border-rose-300',
        badgeClass: 'bg-rose-600 text-white font-black',
        actionBtnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 font-bold',
        icon: customIcon || (type === 'event_rejected' ? '⚠️' : '❌'),
      };
    case 'event_pending_approval':
      return {
        cardBorder: 'border-purple-500 shadow-[0_20px_50px_rgba(168,85,247,0.2)] ring-4 ring-purple-500/10',
        headerBg: 'bg-gradient-to-br from-purple-500/20 via-purple-50 to-white',
        headerBorder: 'border-purple-200',
        iconBox: 'bg-purple-100/90 text-purple-700 border-purple-300',
        badgeClass: 'bg-purple-600 text-white font-black',
        actionBtnClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 font-bold',
        icon: customIcon || '📅',
      };
    case 'event_needs_changes':
      return {
        cardBorder: 'border-amber-500 shadow-[0_20px_50px_rgba(245,158,11,0.2)] ring-4 ring-amber-500/10',
        headerBg: 'bg-gradient-to-br from-amber-500/20 via-amber-50 to-white',
        headerBorder: 'border-amber-200',
        iconBox: 'bg-amber-100/90 text-amber-700 border-amber-300',
        badgeClass: 'bg-amber-600 text-white font-black',
        actionBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 font-bold',
        icon: customIcon || '✏️',
      };
    case 'general_update':
    default:
      return {
        cardBorder: 'border-blue-500 shadow-[0_20px_50px_rgba(59,130,246,0.2)] ring-4 ring-blue-500/10',
        headerBg: 'bg-gradient-to-br from-blue-500/20 via-blue-50 to-white',
        headerBorder: 'border-blue-200',
        iconBox: 'bg-blue-100/90 text-blue-700 border-blue-300',
        badgeClass: 'bg-blue-600 text-white font-black',
        actionBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 font-bold',
        icon: customIcon || '📢',
      };
  }
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Music": <Music className="h-3 w-3" />,
  "Live Music": <Mic2 className="h-3 w-3" />,
  "Podcasts": <Tv className="h-3 w-3" />,
  "Sports": <Trophy className="h-3 w-3" />,
  "Arts": <Palette className="h-3 w-3" />,
  "Education": <BookOpen className="h-3 w-3" />,
  "Spiritual": <Compass className="h-3 w-3" />,
  "Wellness": <Heart className="h-3 w-3" />,
  "Indie": <Activity className="h-3 w-3" />,
  "Techno": <Music className="h-3 w-3" />,
  "Food": <Wine className="h-3 w-3" />,
  "Comedy": <Smile className="h-3 w-3" />,
  "Workshops": <Briefcase className="h-3 w-3" />,
  "Nightlife": <Wine className="h-3 w-3" />,
  "Night Life": <Wine className="h-3 w-3" />,
  "General": <Sparkles className="h-3 w-3" />,
};

// Category-specific active colors for vibrant theme
const VIBRANT_PILL_COLORS: Record<string, string> = {
  "Music": "bg-amber-400 text-black",
  "Live Music": "bg-amber-400 text-black",
  "Arts": "bg-purple-400 text-white",
  "Sports": "bg-orange-400 text-black",
  "Education": "bg-blue-400 text-white",
  "Spiritual": "bg-violet-400 text-white",
  "Wellness": "bg-teal-400 text-black",
  "Indie": "bg-pink-400 text-white",
  "Techno": "bg-cyan-400 text-black",
  "Food": "bg-emerald-400 text-black",
  "Comedy": "bg-yellow-400 text-black",
  "Workshops": "bg-indigo-400 text-white",
  "Nightlife": "bg-indigo-500 text-white",
  "Night Life": "bg-indigo-500 text-white",
  "General": "bg-zinc-400 text-white",
};

export function GlobalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { theme, toggleTheme, isVibrant } = useTheme()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const {
    currentCity, setCity, supportedCities, isLoading,
    selectedCategory, setSelectedCategory, activeCategories, events
  } = useCity()
  const { language, setLanguage, availableLanguages, hasMultipleLanguages, detectedCountryName } = useLanguage()
  const { t, getCategoryLabel } = useTranslation()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showCityMenu, setShowCityMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [isEditor, setIsEditor] = useState(false)
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<ModalNotification | null>(null)
  const [avatarImgError, setAvatarImgError] = useState(false)

  // In-App Notification Center States
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread" | "alerts">("all")
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false)

  const notificationsRef = useRef<HTMLDivElement>(null)
  const cityMenuRef = useRef<HTMLDivElement>(null)
  const langMenuRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (cityMenuRef.current && !cityMenuRef.current.contains(event.target as Node)) {
        setShowCityMenu(false)
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [isMobileMenuOpen])

  const fetchUnreadCount = () => {
    if (!session?.user?.email) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/notifications/unread-count?email=${encodeURIComponent(session.user.email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUnreadCount(data.count || 0);
        }
      })
      .catch(() => { });
  };

  const fetchNotificationsList = (filter = notificationFilter) => {
    if (!session?.user?.email) return;
    setLoadingNotifications(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/notifications?email=${encodeURIComponent(session.user.email)}&filter=${filter}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      })
      .catch(err => console.error("Failed to load notifications:", err))
      .finally(() => setLoadingNotifications(false));
  };

  useEffect(() => {
    if (session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          setIsAdmin(data.isAdmin)
          setIsOrganizer(data.isOrganizer)
          setIsEditor(data.isEditor || false)
          setOrganizerStatus(data.status || null)
          setRejectionReason(data.rejectionReason || null)
        })
        .catch(() => {
          setIsAdmin(false)
          setIsOrganizer(false)
          setIsEditor(false)
          setOrganizerStatus(null)
          setRejectionReason(null)
        });

      fetchUnreadCount();
    }
  }, [session?.user?.email]);

  // Firebase Cloud Messaging Real-Time Registration & Foreground Listener
  useEffect(() => {
    const userEmail = session?.user?.email;
    if (userEmail) {
      // 1. Register Service Worker and FCM Token
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
        const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "";
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";

        if (apiKey && projectId) {
          const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(apiKey)}&projectId=${encodeURIComponent(projectId)}&messagingSenderId=${encodeURIComponent(messagingSenderId)}&appId=${encodeURIComponent(appId)}`;

          navigator.serviceWorker
            .register(swUrl)
            .then((registration) => {
              registration.update().catch(() => {});
              return registerFcmForUser({
                email: userEmail,
                city: currentCity,
                categories: activeCategories,
              });
            })
            .catch((err) => console.log("[FCM Registration Log]:", err));
        }
      }

      // 2. Subscribe to instant real-time foreground broadcasts
      const unsubscribeFcm = onForegroundFcmMessage((payload) => {
        const title = payload.notification?.title || payload.data?.title || "New Broadcast Alert";
        const body = payload.notification?.body || payload.data?.message || "";
        const type = (payload.data?.type as BroadcastType) || "general_update";
        const link = payload.data?.link;
        const typeConfig = BROADCAST_TYPE_CONFIGS[type] || BROADCAST_TYPE_CONFIGS.general_update;

        // Increment unread count badge
        setUnreadCount((c) => c + 1);

        // Render instant toast alert
        toast(
          `${typeConfig.icon} ${title}: ${body}`,
          {
            duration: type === "emergency_alert" ? 10000 : 6000,
            action: link
              ? {
                label: "View",
                onClick: () => router.push(link),
              }
              : undefined,
          }
        );

        // Refresh active list if notification center is open
        fetchNotificationsList();
      });

      return () => {
        unsubscribeFcm();
      };
    }
  }, [session, currentCity]);

  useEffect(() => {
    if (showNotifications && session?.user?.email) {
      fetchNotificationsList(notificationFilter);
    }
  }, [showNotifications, notificationFilter, session]);

  const handleNotificationClick = (notif: UserNotification) => {
    if (!session?.user?.email) return;

    if (!notif.is_read) {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notif.id, email: session.user.email })
      }).catch(err => console.error("Error marking notification read:", err));
    }

    // If this is a post-event rating request, direct the user to the event page directly!
    if (notif.type === 'rating_request') {
      const targetEventId = notif.target_event_id || notif.metadata?.event_id;
      setShowNotifications(false);
      if (targetEventId) {
        router.push(`/event/${targetEventId}`);
        return;
      }
      if (notif.link) {
        router.push(notif.link);
        return;
      }
    }

    const typeConfig = BROADCAST_TYPE_CONFIGS[notif.type] || BROADCAST_TYPE_CONFIGS.general_update;
    const timeStr = new Date(notif.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const isWhatsApp = notif.type === 'whatsapp_group_invite' || (notif.link && (notif.link.includes('whatsapp.com') || notif.link.includes('wa.me')));
    const actionText = isWhatsApp ? "Join WhatsApp Group" : notif.link ? "View Details" : undefined;

    setSelectedNotification({
      type: notif.type,
      badge: typeConfig.label,
      icon: typeConfig.icon,
      title: notif.title,
      message: notif.message,
      link: notif.link || undefined,
      actionText,
      time: timeStr
    });

    setShowNotifications(false);
  };

  const handleOrganizerStatusClick = () => {
    if (organizerStatus === 'pending_approval') {
      setSelectedNotification({
        type: 'approval_pending',
        badge: 'Under Review',
        icon: '📝',
        title: 'Organizer Application Pending',
        message: 'Thank you for applying to become an organizer on VibeCheck Space! Our editorial team is currently reviewing your brand information and event credentials. You will be notified as soon as verification is complete.',
        time: 'Pending Review'
      });
    } else if (organizerStatus === 'rejected') {
      setSelectedNotification({
        type: 'application_rejected',
        badge: 'Action Required',
        icon: '❌',
        title: 'Organizer Application Rejected',
        message: 'Unfortunately, your organizer application could not be approved based on our submission guidelines. Please review the official reason below and submit an updated application.',
        reason: rejectionReason || 'Information provided did not meet organizer verification criteria.',
        link: '/organizer/apply',
        actionText: 'Re-Apply as Organizer',
        time: 'Action Required'
      });
    } else if (organizerStatus === 'approved') {
      setSelectedNotification({
        type: 'application_approved',
        badge: 'Verified Organizer',
        icon: '🎉',
        title: 'Organizer Status Active',
        message: 'Congratulations! You are officially verified as a VibeCheck Organizer. You have full access to create events, manage RSVPs, broadcast WhatsApp updates, and connect with followers.',
        link: '/organizer',
        actionText: 'Open Organizer Hub',
        time: 'Verified'
      });
    }
    setShowNotifications(false);
  };

  const handleMarkAllRead = async () => {
    if (!session?.user?.email || unreadCount === 0) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/notifications/mark-all-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.user.email })
    }).catch(err => console.error("Error marking all notifications read:", err));
  };

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut({ callbackUrl: "/" })
  }

  const categories = [
    { name: "The Latest", icon: <Sparkles className="h-3 w-3" /> },
    ...activeCategories.map(cat => ({
      name: cat,
      icon: CATEGORY_ICONS[cat] || null
    }))
  ];

  return (
    <div className="sticky top-0 z-[110]">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-black/5 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between py-3">
          {/* Logo & City */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-1.5 sm:gap-2">
              <img src="/logo.png" alt="VibeCheck Space Logo" className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg shrink-0 object-contain" />
              <div className="flex flex-col items-end leading-none">
                <span className="text-lg sm:text-xl vibecheck_font_style leading-none">VIBECHECK</span>
                <span className="text-xs sm:text-[13px] vibecheck_font_style not-italic -skew-x-[13.5deg] text-primary leading-none tracking-tight inline-block origin-right scale-x-[1.25] scale-y-[0.82] pr-0 -mt-1 sm:-mt-1.5">SPACE</span>
              </div>
            </Link>

            <div className="h-4 w-[1px] bg-black/10 mx-1 sm:mx-2" />

            <div className="relative" ref={cityMenuRef}>
              <button
                onClick={() => setShowCityMenu(!showCityMenu)}
                disabled={isLoading}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 hover:bg-black/5 rounded-full transition-all text-[10px] sm:text-[11px] font-bold tracking-tight text-zinc-600 hover:text-black disabled:opacity-50 uppercase"
              >
                <MapPin className="h-3 w-3 text-primary" />
                {isLoading ? "..." : currentCity}
                <ChevronDown className={`h-3 w-3 transition-transform ${showCityMenu ? 'rotate-180' : ''}`} />
              </button>

              {showCityMenu && (
                <>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-black/5 rounded-[20px] shadow-2xl z-20 overflow-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid gap-1">
                      {supportedCities.map((cityObj) => (
                        <button
                          key={cityObj.id}
                          onClick={() => {
                            setCity(cityObj.name);
                            setShowCityMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${cityObj.name === currentCity
                              ? 'bg-primary/10 text-primary'
                              : 'text-zinc-500 hover:bg-black/5 hover:text-black'
                            }`}
                        >
                          {cityObj.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Language Selector: only shown if location has multiple languages (e.g. Netherlands: English + Dutch) */}
            {hasMultipleLanguages && (
              <>
                <div className="h-4 w-[1px] bg-black/10 mx-1 sm:mx-2" />
                <div className="relative" ref={langMenuRef}>
                  <button
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 hover:bg-black/5 rounded-full transition-all text-[10px] sm:text-[11px] font-bold tracking-tight text-zinc-700 hover:text-black uppercase border border-black/5"
                    title={`Language: ${ALL_LANGUAGES[language]?.name}`}
                  >
                    <span className="text-xs">{ALL_LANGUAGES[language]?.flag}</span>
                    <span>{language.toUpperCase()}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showLangMenu && (
                    <div className="absolute top-full left-0 mt-2 w-36 bg-white border border-black/5 rounded-[20px] shadow-2xl z-20 overflow-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="grid gap-1">
                        {availableLanguages.map((langOpt) => (
                          <button
                            key={langOpt.code}
                            onClick={() => {
                              setLanguage(langOpt.code);
                              setShowLangMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                              langOpt.code === language
                                ? 'bg-primary/10 text-primary'
                                : 'text-zinc-500 hover:bg-black/5 hover:text-black'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{langOpt.flag}</span>
                              <span>{langOpt.nativeName}</span>
                            </span>
                            {langOpt.code === language && <CheckCircle2 className="h-3 w-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-sm mx-2 lg:mx-4">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder={t("nav.search_placeholder")}
                className="block w-full pl-11 pr-4 py-2 bg-zinc-100/50 border-none rounded-full text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {/* Local Currents always visible on Desktop */}
            <div className="hidden lg:flex items-center gap-2 mr-1">
              <Link href="/local-currents">
                <button className="ringer-button border border-black/5 bg-zinc-50 hover:bg-black hover:text-white text-[10px] py-2 px-4">
                  {t("nav.local_currents")}
                </button>
              </Link>
            </div>

            {session ? (
              <>
                <div className="hidden lg:flex items-center gap-2 mr-2">
                  {isOrganizer && organizerStatus === 'approved' ? (
                    <Link href="/organizer">
                      <button className="ringer-button bg-primary text-black hover:bg-black hover:text-white text-[10px] py-2 px-4 border-none transition-colors">
                        {t("nav.organizer_hub")}
                      </button>
                    </Link>
                  ) : isOrganizer && organizerStatus === 'pending_approval' ? (
                    <button
                      onClick={handleOrganizerStatusClick}
                      className="ringer-button border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] py-2 px-3 flex items-center gap-1.5 font-black uppercase tracking-wider transition-all shadow-xs"
                      title="Click to view application status"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                      <span>{t("nav.approval_pending")}</span>
                    </button>
                  ) : isOrganizer && organizerStatus === 'rejected' ? (
                    <button
                      onClick={handleOrganizerStatusClick}
                      className="ringer-button border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 text-[10px] py-2 px-3 flex items-center gap-1.5 font-black uppercase tracking-wider transition-all shadow-xs"
                      title="Click to view rejection reason"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{t("nav.rejected")}</span>
                    </button>
                  ) : (
                    <Link href="/organizer/apply">
                      <button className="ringer-button border border-black/5 bg-zinc-50 hover:bg-black hover:text-white text-[10px] py-2 px-4">
                        {t("nav.become_organizer")}
                      </button>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin">
                      <button className="ringer-button bg-black text-white hover:bg-zinc-800 text-[10px] py-2 px-4 border-none transition-colors">
                        {t("nav.admin")}
                      </button>
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {/* Notification Center Bell */}
                  <div className="relative mr-1" ref={notificationsRef}>
                    <button
                      onClick={() => {
                        setShowNotifications(!showNotifications);
                        setShowProfileMenu(false);
                      }}
                      className="relative p-2 hover:bg-black/5 rounded-full transition-all text-zinc-600 hover:text-black flex items-center justify-center shrink-0"
                      title="Notifications"
                    >
                      <Bell className="h-4.5 w-4.5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center ring-2 ring-white animate-pulse">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <>
                        <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[72px] sm:top-full mt-2 sm:w-96 bg-white border border-black/10 rounded-[28px] shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200 text-black max-h-[calc(100vh-90px)] sm:max-h-[80vh] flex flex-col">
                          {/* Header */}
                          <div className="flex items-center justify-between border-b border-black/5 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">{t("nav.notifications")}</h4>
                              {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-rose-500/10 text-rose-600 border border-rose-200">
                                  {unreadCount} new
                                </span>
                              )}
                            </div>
                            {unreadCount > 0 && (
                              <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-bold text-zinc-400 hover:text-black uppercase tracking-wider transition-colors"
                              >
                                {t("nav.mark_all_read")}
                              </button>
                            )}
                          </div>

                          {/* Filter Tabs */}
                          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl mb-3 text-[10px] font-bold">
                            {(["all", "unread", "alerts"] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setNotificationFilter(tab)}
                                className={`flex-1 py-1 rounded-lg uppercase tracking-wider transition-all ${notificationFilter === tab
                                    ? "bg-white text-black shadow-xs font-black"
                                    : "text-zinc-500 hover:text-black"
                                  }`}
                              >
                                {tab === "all" ? t("nav.filter_all") : tab === "unread" ? t("nav.filter_unread") : t("nav.filter_alerts")}
                              </button>
                            ))}
                          </div>

                          {/* Notification List Container */}
                          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 custom-scrollbar max-h-[50vh]">
                            {/* Organizer Application Status Notice (if pending/rejected) */}
                            {isOrganizer && (organizerStatus === 'pending_approval' || organizerStatus === 'rejected') && (
                              <div className="mb-2 cursor-pointer" onClick={handleOrganizerStatusClick}>
                                {organizerStatus === 'pending_approval' ? (
                                  <div className="flex flex-col gap-1 bg-amber-50/70 p-3 rounded-2xl border border-amber-200 text-left hover:bg-amber-100/70 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Application Pending</span>
                                      <span className="text-[9px] font-bold text-amber-500">Tap for details →</span>
                                    </div>
                                    <p className="text-xs font-bold text-zinc-700 leading-tight">Your organizer application is currently under review by our team.</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5 bg-red-50/70 p-3 rounded-2xl border border-red-200 text-left hover:bg-red-100/70 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-red-600">Application Rejected</span>
                                      <span className="text-[9px] font-bold text-red-500">Tap to view reason →</span>
                                    </div>
                                    <p className="text-xs font-bold text-zinc-700 leading-tight">Unfortunately, your organizer application was rejected.</p>
                                    {rejectionReason && (
                                      <div className="bg-white/80 p-2 rounded-xl border border-red-100/50 mt-0.5">
                                        <p className="text-[11px] font-bold text-zinc-800 italic">"{rejectionReason}"</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {loadingNotifications ? (
                              <div className="space-y-2 py-4">
                                {[1, 2, 3].map((i) => (
                                  <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />
                                ))}
                              </div>
                            ) : notifications.length === 0 ? (
                              <div className="py-12 text-center text-zinc-400">
                                <Sparkles className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                                <p className="text-xs font-black uppercase tracking-wider text-zinc-600">{t("nav.all_caught_up")}</p>
                                <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{t("nav.no_notifications")}</p>
                              </div>
                            ) : (
                              notifications.map((notif) => {
                                const typeCfg = BROADCAST_TYPE_CONFIGS[notif.type] || BROADCAST_TYPE_CONFIGS.general_update;
                                const timeStr = new Date(notif.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                });

                                return (
                                  <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex items-start gap-3 group hover:scale-[1.01] ${notif.is_read
                                        ? "bg-zinc-50/50 border-black/5 hover:bg-zinc-100/60 opacity-80"
                                        : `${typeCfg.cardBg} border-black/10 hover:border-black/20 shadow-xs`
                                      } ${notif.type === "emergency_alert" && !notif.is_read
                                        ? "border-red-300 ring-1 ring-red-400/30"
                                        : ""
                                      }`}
                                  >
                                    <span className="text-xl shrink-0 p-1 bg-white rounded-xl shadow-xs border border-black/5">
                                      {typeCfg.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeCfg.badgeBg}`}>
                                          {typeCfg.label}
                                        </span>
                                        <span className="text-[9px] font-medium text-zinc-400 shrink-0">
                                          {timeStr}
                                        </span>
                                      </div>
                                      <h5 className={`text-xs leading-snug truncate group-hover:underline ${notif.is_read ? 'font-bold text-zinc-700' : 'font-black text-black'}`}>
                                        {notif.title}
                                      </h5>
                                      <p className="text-[11px] text-zinc-500 font-medium leading-tight line-clamp-2 mt-0.5">
                                        {notif.message}
                                      </p>
                                    </div>
                                    {!notif.is_read && (
                                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                        {/* Backdrop for closing notification dropdown */}
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setShowNotifications(false)}
                        />
                      </>
                    )}
                  </div>

                  {/* Profile Avatar Trigger & Dropdown Menu */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => {
                        setShowProfileMenu(!showProfileMenu);
                        setShowNotifications(false);
                      }}
                      className="relative group block rounded-full focus:outline-none transition-all"
                      aria-label="Account Menu"
                      title={session.user?.name || "Account"}
                    >
                      <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full border overflow-hidden bg-zinc-100 flex items-center justify-center transition-all shadow-xs ${
                        showProfileMenu ? 'ring-2 ring-black border-black' : 'border-black/10 hover:ring-2 hover:ring-black'
                      }`}>
                        {session.user?.image && !avatarImgError ? (
                          <img
                            src={session.user.image}
                            alt=""
                            onError={() => setAvatarImgError(true)}
                            className="h-full w-full object-cover"
                          />
                        ) : session.user?.name ? (
                          <span className="text-xs font-black text-black">
                            {session.user.name.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <User className="h-4 w-4 text-zinc-600" />
                        )}
                      </div>
                      {isAdmin ? (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-black border-2 border-white ring-1 ring-black/10" title="Admin" />
                      ) : isOrganizer && organizerStatus === 'approved' ? (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20" title="Verified Organizer" />
                      ) : null}
                    </button>

                    {showProfileMenu && (
                      <>
                        <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[72px] sm:top-full mt-2 sm:w-80 bg-white border border-black/10 rounded-[28px] shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200 text-black flex flex-col">
                          {/* User Profile Header Card */}
                          <div className="p-3 bg-zinc-50 rounded-2xl border border-black/5 mb-3 flex items-center gap-3">
                            <div className="h-11 w-11 rounded-full border border-black/10 overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-xs">
                              {session.user?.image && !avatarImgError ? (
                                <img
                                  src={session.user.image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-black text-black">
                                  {session.user?.name?.charAt(0).toUpperCase() || "U"}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="text-xs font-black text-zinc-900 truncate leading-tight">
                                {session.user?.name || "Community Member"}
                              </h4>
                              <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                                {session.user?.email}
                              </p>
                              <div className="mt-1.5">
                                {isAdmin ? (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-full">
                                    <Shield className="w-2.5 h-2.5 text-primary" /> SuperAdmin
                                  </span>
                                ) : isOrganizer && organizerStatus === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Verified Organizer
                                  </span>
                                ) : isOrganizer && organizerStatus === 'pending_approval' ? (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <Clock className="w-2.5 h-2.5 text-amber-500" /> Organizer (Pending)
                                  </span>
                                ) : isOrganizer && organizerStatus === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                                    <AlertCircle className="w-2.5 h-2.5 text-red-500" /> Application Rejected
                                  </span>
                                ) : isEditor ? (
                                  <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                                    Editor
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider bg-zinc-200/70 text-zinc-600 px-2 py-0.5 rounded-full">
                                    Community Member
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Menu Navigation Links */}
                          <div className="space-y-1 text-left">
                            <Link
                              href="/preferences"
                              onClick={() => setShowProfileMenu(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-100/80 transition-colors group"
                            >
                              <div className="h-8 w-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors text-zinc-700">
                                <Sliders className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-black uppercase tracking-wider block text-zinc-900 group-hover:text-black">
                                  {t("nav.preferences")}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-medium block">
                                  Home base, vibe tags & alerts
                                </span>
                              </div>
                            </Link>

                            <Link
                              href="/local-currents"
                              onClick={() => setShowProfileMenu(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-100/80 transition-colors group"
                            >
                              <div className="h-8 w-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors text-zinc-700">
                                <Newspaper className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-black uppercase tracking-wider block text-zinc-900 group-hover:text-black">
                                  {t("nav.local_currents")}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-medium block">
                                  Real-time city news and radar
                                </span>
                              </div>
                            </Link>

                            {isOrganizer && organizerStatus === 'approved' ? (
                              <Link
                                href="/organizer"
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors group"
                              >
                                <div className="h-8 w-8 rounded-lg bg-primary text-black flex items-center justify-center transition-colors">
                                  <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-black uppercase tracking-wider block text-black">
                                    {t("nav.organizer_hub")}
                                  </span>
                                  <span className="text-[10px] text-zinc-600 font-medium block">
                                    Host events, RSVPs & broadcasts
                                  </span>
                                </div>
                              </Link>
                            ) : isOrganizer && (organizerStatus === 'pending_approval' || organizerStatus === 'rejected') ? (
                              <button
                                onClick={() => { setShowProfileMenu(false); handleOrganizerStatusClick(); }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-100/80 transition-colors group text-left"
                              >
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${organizerStatus === 'pending_approval' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {organizerStatus === 'pending_approval' ? <Clock className="h-4 w-4 animate-pulse" /> : <AlertCircle className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-black uppercase tracking-wider block text-zinc-900">
                                    {organizerStatus === 'pending_approval' ? t("nav.approval_pending") : t("nav.rejected")}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium block">
                                    Click to view status details
                                  </span>
                                </div>
                              </button>
                            ) : (
                              <Link
                                href="/organizer/apply"
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-100/80 transition-colors group"
                              >
                                <div className="h-8 w-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors text-zinc-700">
                                  <Briefcase className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-black uppercase tracking-wider block text-zinc-900 group-hover:text-black">
                                    {t("nav.become_organizer")}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium block">
                                    Publish events and build community
                                  </span>
                                </div>
                              </Link>
                            )}

                            {isAdmin && (
                              <Link
                                href="/admin"
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-black text-white hover:bg-zinc-800 transition-colors group"
                              >
                                <div className="h-8 w-8 rounded-lg bg-zinc-800 text-primary flex items-center justify-center transition-colors">
                                  <Shield className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-black uppercase tracking-wider block text-white">
                                    {t("nav.admin")} Portal
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium block">
                                    Platform administration
                                  </span>
                                </div>
                              </Link>
                            )}
                          </div>

                          <div className="w-full h-[1px] bg-black/5 my-2.5" />

                          {/* Sign out */}
                          <button
                            onClick={() => { setShowProfileMenu(false); handleSignOut(); }}
                            disabled={isSigningOut}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50 text-zinc-600 hover:text-red-600 transition-colors text-left group"
                          >
                            <div className="h-8 w-8 rounded-lg bg-zinc-100 group-hover:bg-red-100 group-hover:text-red-600 flex items-center justify-center transition-colors text-zinc-600">
                              <LogOut className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-black uppercase tracking-wider block">
                                {isSigningOut ? "Disconnecting..." : t("nav.disconnect")}
                              </span>
                              <span className="text-[10px] text-zinc-400 group-hover:text-red-400 font-medium block">
                                Sign out of current session
                              </span>
                            </div>
                          </button>
                        </div>

                        {/* Backdrop for closing profile dropdown */}
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setShowProfileMenu(false)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="ringer-button bg-primary text-black hover:bg-black hover:text-white text-[10px] py-2 px-4 border-none transition-colors"
              >
                {t("nav.join_vibe")}
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-zinc-100 hover:bg-black hover:text-white transition-colors flex items-center justify-center shrink-0"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        {pathname === "/dashboard" && events.length > 0 && (
          <div className="max-w-7xl mx-auto h-12 flex items-center border-t border-black/5 overflow-x-auto no-scrollbar gap-2 py-1 snap-x snap-mandatory px-4 sm:px-6 scroll-pl-4 sm:scroll-pl-6 after:content-[''] after:w-px after:shrink-0">
            {categories.map((cat, i) => {
              const isActive = selectedCategory === cat.name;
              const vibrantActiveClass = isVibrant && isActive
                ? (VIBRANT_PILL_COLORS[cat.name] || 'bg-black text-white') + ' border-transparent'
                : '';
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`sticker-badge flex items-center gap-1.5 whitespace-nowrap h-8 px-4 transition-all snap-start ${isActive
                      ? (isVibrant ? vibrantActiveClass : 'bg-black text-white border-transparent')
                      : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-black border-black/10'
                    }`}
                >
                  {cat.icon}
                  {getCategoryLabel(cat.name)}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          <div className={`fixed inset-0 ${pathname === "/dashboard" && events.length > 0 ? "top-[121px]" : "top-[73px]"} z-40 bg-black/40 backdrop-blur-sm`} onClick={() => setIsMobileMenuOpen(false)} />
          <div className={`fixed ${pathname === "/dashboard" && events.length > 0 ? "top-[121px]" : "top-[73px]"} left-0 right-0 z-50 bg-white border-b border-black/5 shadow-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300 overflow-y-auto ${pathname === "/dashboard" && events.length > 0 ? "max-h-[calc(100vh-121px)]" : "max-h-[calc(100vh-73px)]"} no-scrollbar`}>
            {/* Search Bar in Mobile Menu */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder={t("nav.search_placeholder")}
                className="block w-full pl-11 pr-4 py-3 bg-zinc-100/50 border-none rounded-full text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-zinc-500 text-black"
              />
            </div>

            {/* Mobile Language Switcher (if Netherlands / multiple languages) */}
            {hasMultipleLanguages && (
              <div className="flex items-center justify-between bg-zinc-50 p-3.5 rounded-2xl border border-black/5">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Language / Taal</span>
                  <span className="text-xs font-bold text-black">{ALL_LANGUAGES[language]?.nativeName}</span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-200/60 p-1 rounded-xl">
                  {availableLanguages.map((langOpt) => (
                    <button
                      key={langOpt.code}
                      onClick={() => setLanguage(langOpt.code)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        language === langOpt.code ? "bg-black text-white shadow-xs" : "text-zinc-600 hover:text-black"
                      }`}
                    >
                      {langOpt.flag} {langOpt.code.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation links */}
            <nav className="flex flex-col gap-3">
              {/* Local Currents always visible on Mobile */}
              <Link href="/local-currents" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-full text-left px-5 py-4 rounded-2xl bg-zinc-50 hover:bg-black hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                  {t("nav.local_currents")}
                </div>
              </Link>

              {session ? (
                <>
                  <Link href="/preferences" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-full text-left px-5 py-4 rounded-2xl bg-zinc-50 hover:bg-black hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                      {t("nav.preferences")}
                    </div>
                  </Link>

                  {isOrganizer && organizerStatus === 'approved' ? (
                    <Link href="/organizer" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="w-full text-left px-5 py-4 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all text-xs font-black uppercase tracking-widest">
                        {t("nav.organizer_hub")}
                      </div>
                    </Link>
                  ) : isOrganizer && organizerStatus === 'pending_approval' ? (
                    <div
                      onClick={() => { setIsMobileMenuOpen(false); handleOrganizerStatusClick(); }}
                      className="w-full text-left px-5 py-4 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-black uppercase tracking-widest flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                        <span>{t("nav.approval_pending")}</span>
                      </div>
                      <span className="text-[10px] bg-amber-500 text-white font-bold px-2.5 py-0.5 rounded-full uppercase">Review</span>
                    </div>
                  ) : isOrganizer && organizerStatus === 'rejected' ? (
                    <div
                      onClick={() => { setIsMobileMenuOpen(false); handleOrganizerStatusClick(); }}
                      className="w-full text-left px-5 py-4 rounded-2xl bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 text-xs font-black uppercase tracking-widest flex items-center justify-between cursor-pointer hover:bg-red-500/20 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{t("nav.rejected")}</span>
                      </div>
                      <span className="text-[10px] bg-red-500 text-white font-bold px-2.5 py-0.5 rounded-full uppercase">Reason</span>
                    </div>
                  ) : (
                    <Link href="/organizer/apply" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="w-full text-left px-5 py-4 rounded-2xl bg-zinc-50 hover:bg-black hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                        {t("nav.become_organizer")}
                      </div>
                    </Link>
                  )}

                  {isAdmin && (
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="w-full text-left px-5 py-4 rounded-2xl bg-black text-white hover:bg-zinc-800 transition-all text-xs font-black uppercase tracking-widest">
                        {t("nav.admin")}
                      </div>
                    </Link>
                  )}

                  <div className="w-full h-[1px] bg-black/5 my-2"></div>

                  <div className="flex items-center justify-between bg-zinc-100 p-4 rounded-2xl mt-2">
                    <div className="flex flex-col min-w-0 pr-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t("nav.signed_in_as")}</p>
                      <p className="text-xs font-bold text-black mt-0.5 truncate">{session.user?.name}</p>
                    </div>

                    <button
                      onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
                      disabled={isSigningOut}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      {isSigningOut ? "..." : t("nav.disconnect")}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => { signIn("google"); setIsMobileMenuOpen(false); }}
                  className="w-full text-center py-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-md"
                >
                  {t("nav.join_vibe")}
                </button>
              )}
            </nav>
          </div>
        </>
      )}

      {/* Themed Notification Pop-up Modal */}
      {selectedNotification && (() => {
        const modalTheme = getNotificationModalTheme(selectedNotification.type, selectedNotification.icon);

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setSelectedNotification(null)}
            />
            <div
              className={`relative z-10 w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl border-4 transition-all animate-in zoom-in-95 duration-200 ${modalTheme.cardBorder}`}
            >
              {/* Modal Themed Header */}
              <div
                className={`p-6 sm:p-7 flex items-start justify-between border-b ${modalTheme.headerBg} ${modalTheme.headerBorder}`}
              >
                <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0 pr-2">
                  {/* Broadcast Type Icon */}
                  <div className={`p-3 sm:p-3.5 rounded-2xl shrink-0 flex items-center justify-center text-2xl sm:text-3xl shadow-sm border ${modalTheme.iconBox}`}>
                    <span>{modalTheme.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`sticker-badge text-[9px] font-black uppercase py-0.5 px-2.5 border-none shadow-xs ${modalTheme.badgeClass}`}
                      >
                        {selectedNotification.badge}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {selectedNotification.time}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight mt-1.5 leading-tight text-black break-words">
                      {selectedNotification.title}
                    </h3>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-2 rounded-full hover:bg-black/5 text-zinc-400 hover:text-black transition-colors shrink-0 -mt-1 -mr-1"
                  aria-label="Close notification"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6 text-left">
                <p className="text-sm font-medium text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>

                {/* Reason Box for Rejection or Extra details */}
                {selectedNotification.reason && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600 block">
                      Official Reason for Decision
                    </span>
                    <p className="text-xs font-bold text-red-950 italic leading-normal">
                      "{selectedNotification.reason}"
                    </p>
                  </div>
                )}

                {/* Action Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="w-full sm:w-auto ringer-button border border-black/10 bg-zinc-100 hover:bg-zinc-200 text-black text-xs py-2.5 px-5 transition-colors"
                  >
                    DISMISS
                  </button>
                  {selectedNotification.type === 'rating_request' ? (
                    <button
                      onClick={() => {
                        const notif = selectedNotification;
                        const link = notif.link || '/event';
                        setSelectedNotification(null);
                        router.push(link);
                      }}
                      className="w-full sm:w-auto ringer-button bg-amber-500 hover:bg-amber-600 text-black font-black text-xs py-2.5 px-5 flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
                    >
                      <span>⭐ GO TO EVENT &amp; RATE</span>
                    </button>
                  ) : selectedNotification.link ? (
                    <button
                      onClick={() => {
                        const link = selectedNotification.link!;
                        setSelectedNotification(null);
                        if (link.startsWith("http://") || link.startsWith("https://")) {
                          window.open(link, "_blank", "noopener,noreferrer");
                        } else {
                          router.push(link);
                        }
                      }}
                      className={`w-full sm:w-auto ringer-button text-xs py-2.5 px-5 flex items-center justify-center gap-2 transition-all ${modalTheme.actionBtnClass}`}
                    >
                      <span>{selectedNotification.actionText || 'VIEW DETAILS'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  )
}
