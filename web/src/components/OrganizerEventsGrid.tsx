"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  Key,
  Radio,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Lock,
  Edit,
  AlertCircle,
  Filter,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrganizerEventBroadcastModal } from "@/components/OrganizerEventBroadcastModal";
import { OrganizerTelegramInviteModal } from "@/components/OrganizerTelegramInviteModal";
import { BroadcastType } from "@/types/broadcast";

export interface OrganizerEvent {
  id: string;
  title: string;
  category?: string;
  city?: string;
  location?: string;
  status: string;
  visibility?: string;
  invite_count?: number;
  date_time: string;
  end_time?: string;
  admin_comment?: string;
  whatsapp_group_link?: string;
  is_paid?: boolean;
}

interface OrganizerEventsGridProps {
  events: OrganizerEvent[];
  organizerEmail: string;
  onEditEvent: (event: OrganizerEvent) => void;
  onRefreshEvents: () => void;
}

export function OrganizerEventsGrid({
  events,
  organizerEmail,
  onEditEvent,
  onRefreshEvents,
}: OrganizerEventsGridProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date_time", desc: false }, // Upcoming/earliest first
  ]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Modals & State for Outreach / Marketing / Promo
  const [broadcastEvent, setBroadcastEvent] = useState<OrganizerEvent | null>(null);
  const [broadcastInitialType, setBroadcastInitialType] = useState<BroadcastType>("general_update");
  const [inAppBroadcastOpen, setInAppBroadcastOpen] = useState(false);

  const [telegramEvent, setTelegramEvent] = useState<OrganizerEvent | null>(null);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);

  const [promoEvent, setPromoEvent] = useState<OrganizerEvent | null>(null);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoData, setPromoData] = useState("");

  const [smsBroadcastEvent, setSmsBroadcastEvent] = useState<OrganizerEvent | null>(null);
  const [smsBroadcastOpen, setSmsBroadcastOpen] = useState(false);
  const [broadcastStats, setBroadcastStats] = useState<{ eligibleCount: number; costPerMessage: number; totalCost: number } | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success">("idle");

  // Filtered dataset
  const filteredData = useMemo(() => {
    const now = Date.now();
    return events.filter((ev) => {
      const eventEndMs = ev.end_time ? new Date(ev.end_time).getTime() : new Date(ev.date_time).getTime();
      const isPast = !isNaN(eventEndMs) && now > eventEndMs;

      // Category filter
      if (categoryFilter !== "all" && ev.category !== categoryFilter) {
        return false;
      }

      // Status tab filter
      if (statusFilter === "active") {
        return !isPast && (ev.status === "approved" || ev.status === "filling_fast" || ev.status === "housefull");
      }
      if (statusFilter === "past") {
        return isPast || ev.status === "ended";
      }
      if (statusFilter === "pending") {
        return ev.status === "pending" || !ev.status;
      }
      if (statusFilter === "needs_changes") {
        return ev.status === "needs_changes" || ev.status === "rejected";
      }

      return true;
    });
  }, [events, statusFilter, categoryFilter]);

  // Categories list for filtering
  const categories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats);
  }, [events]);

  const copyBouncerScannerLink = async (eventId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/scanner-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizer_email: organizerEmail, gate_name: "Gate 1" }),
      });
      const data = await res.json();
      if (data.success && data.scanner_url) {
        await navigator.clipboard.writeText(data.scanner_url);
        toast.success(`Gate Scanner Link & PIN (${data.pin_code}) copied to clipboard! Share with your door staff.`);
      } else {
        toast.error("Failed to generate scanner PIN");
      }
    } catch (err) {
      toast.error("Error creating scanner link");
    }
  };

  const openPromoKit = async (ev: OrganizerEvent) => {
    setPromoEvent(ev);
    setPromoModalOpen(true);
    setPromoLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const r = await fetch(`${baseUrl}/api/organizer/events/${ev.id}/promo?email=${encodeURIComponent(organizerEmail)}`);
      const d = await r.json();
      if (d.success) setPromoData(d.data);
    } catch (e) {
      console.error("Promo fetch failed", e);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleStatusUpdate = async (eventId: string, newStatus: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizer_email: organizerEmail, status: newStatus }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(d.message);
        onRefreshEvents();

        if (newStatus === "filling_fast" || newStatus === "housefull") {
          const ev = events.find((e) => e.id === eventId);
          toast("Update attendees?", {
            description: `Notify your RSVPs that the event is ${newStatus === "filling_fast" ? "Filling Fast" : "Sold Out"}`,
            action: {
              label: "Broadcast",
              onClick: () => {
                if (ev) {
                  setBroadcastEvent(ev);
                  setBroadcastInitialType("general_update");
                  setInAppBroadcastOpen(true);
                }
              },
            },
            duration: 8000,
          });
        } else if (newStatus === "ended") {
          const ev = events.find((e) => e.id === eventId);
          toast("Event Concluded! ⭐", {
            description: "Request star ratings from attendees (24h window active).",
            action: {
              label: "Request Ratings",
              onClick: () => {
                if (ev) {
                  setBroadcastEvent(ev);
                  setBroadcastInitialType("rating_request");
                  setInAppBroadcastOpen(true);
                }
              },
            },
            duration: 8000,
          });
        }
      } else {
        toast.error(d.error || "Failed to update status");
      }
    } catch (err) {
      toast.error("An error occurred updating event status");
    }
  };

  // Define Table Columns using TanStack Table
  const columns = useMemo<ColumnDef<OrganizerEvent>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-zinc-500 hover:text-black transition-colors"
          >
            <span>Event & Details</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3 w-3 text-primary" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3 w-3 text-primary" />
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-300 opacity-60" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const ev = row.original;
          return (
            <div className="flex flex-col gap-1 min-w-[200px] max-w-[320px] py-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {ev.category && (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[8px] font-black tracking-widest uppercase">
                    {ev.category}
                  </span>
                )}
                {ev.visibility === "invite_only" && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-300/40 text-[8px] font-black flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> VIP {ev.invite_count !== undefined ? `(${ev.invite_count})` : ""}
                  </span>
                )}
              </div>
              <h4 className="font-black text-black text-sm uppercase tracking-tight line-clamp-2 leading-snug">
                {ev.title}
              </h4>
              {(ev.admin_comment && (ev.status === "rejected" || ev.status === "needs_changes")) && (
                <div className="mt-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2 rounded-xl flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black uppercase tracking-wider block text-[8px]">Admin Feedback:</span>
                    {ev.admin_comment}
                  </div>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "date_time",
        accessorKey: "date_time",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-zinc-500 hover:text-black transition-colors"
          >
            <span>Schedule</span>
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3 w-3 text-primary" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3 w-3 text-primary" />
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-300 opacity-60" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const ev = row.original;
          const eventDateObj = new Date(ev.date_time);
          const eventEndMs = ev.end_time ? new Date(ev.end_time).getTime() : eventDateObj.getTime();
          const now = Date.now();
          const isPast = !isNaN(eventEndMs) && now > eventEndMs;

          const formattedDate = !isNaN(eventDateObj.getTime())
            ? eventDateObj.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
            : ev.date_time;
          const formattedTime = !isNaN(eventDateObj.getTime())
            ? eventDateObj.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : "";

          return (
            <div className="flex flex-col gap-0.5 text-[11px] whitespace-nowrap py-1">
              <div className="flex items-center gap-1.5 font-black text-zinc-800">
                <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>{formattedDate}</span>
              </div>
              {formattedTime && (
                <div className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                  <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span>{formattedTime}</span>
                </div>
              )}
              <span className={cn(
                "inline-block w-fit px-1.5 py-0.2 mt-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                isPast ? "bg-zinc-100 text-zinc-500" : "bg-emerald-50 text-emerald-700"
              )}>
                {isPast ? "Ended" : "Upcoming"}
              </span>
            </div>
          );
        },
      },
      {
        id: "location",
        header: () => <span className="font-black uppercase text-[10px] tracking-wider text-zinc-500">Location</span>,
        cell: ({ row }) => {
          const ev = row.original;
          const locText = [ev.location, ev.city].filter(Boolean).join(", ");
          return (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 max-w-[180px] py-1">
              <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate" title={locText || "Venue not set"}>
                {locText || "Online / Not specified"}
              </span>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: () => <span className="font-black uppercase text-[10px] tracking-wider text-zinc-500">Status & Validity</span>,
        cell: ({ row }) => {
          const ev = row.original;
          const eventEndMs = ev.end_time ? new Date(ev.end_time).getTime() : new Date(ev.date_time).getTime();
          const now = Date.now();
          const isPast = !isNaN(eventEndMs) && now > eventEndMs;

          // Crucial Validation: An expired event should NEVER show "Tickets Live"
          let effectiveStatus = ev.status;
          if (isPast && ev.status !== "rejected" && ev.status !== "needs_changes") {
            effectiveStatus = "ended";
          }

          const renderStatusBadge = () => {
            if (isPast || effectiveStatus === "ended") {
              return (
                <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-white border border-zinc-700 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5 text-zinc-400" /> Event Ended
                </span>
              );
            }
            switch (effectiveStatus) {
              case "approved":
                return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase tracking-wider">Tickets Live</span>;
              case "filling_fast":
                return <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><Sparkles className="h-2.5 w-2.5 animate-pulse" /> Filling Fast</span>;
              case "housefull":
                return <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 text-[9px] font-black uppercase tracking-wider">Sold Out</span>;
              case "rejected":
                return <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[9px] font-black uppercase tracking-wider">Rejected</span>;
              case "needs_changes":
                return <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black uppercase tracking-wider">Needs Changes</span>;
              default:
                return <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px] font-black uppercase tracking-wider">Pending Review</span>;
            }
          };

          return (
            <div className="flex flex-col gap-1.5 min-w-[140px] py-1" onClick={(e) => e.stopPropagation()}>
              <div>{renderStatusBadge()}</div>

              {/* Status Selector Dropdown for active events */}
              {!isPast && (effectiveStatus === "approved" || effectiveStatus === "filling_fast" || effectiveStatus === "housefull") && (
                <Select
                  value={effectiveStatus}
                  onValueChange={(val) => {
                    if (val) handleStatusUpdate(ev.id, val);
                  }}
                >
                  <SelectTrigger className="h-7 text-[9px] font-black uppercase tracking-wider border-black/10 bg-zinc-50 hover:bg-zinc-100 rounded-full px-2.5 w-full">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/10 rounded-xl shadow-xl p-1 z-50">
                    <SelectItem value="approved" className="text-[10px] font-bold uppercase text-emerald-700 rounded-lg">Tickets Live</SelectItem>
                    <SelectItem value="filling_fast" className="text-[10px] font-bold uppercase text-orange-600 rounded-lg">Filling Fast</SelectItem>
                    <SelectItem value="housefull" className="text-[10px] font-bold uppercase text-red-600 rounded-lg">Sold Out</SelectItem>
                    <SelectItem value="ended" className="text-[10px] font-bold uppercase text-zinc-800 rounded-lg">End Event</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {effectiveStatus === "needs_changes" && (
                <button
                  onClick={() => onEditEvent(ev)}
                  className="ringer-button py-1 px-2.5 bg-orange-500 hover:bg-orange-600 text-white text-[9px] flex items-center justify-center gap-1 font-black shadow-xs rounded-full"
                >
                  <Edit className="h-2.5 w-2.5" /> Edit Vibe
                </button>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="font-black uppercase text-[10px] tracking-wider text-zinc-500">Outreach & Operations</span>,
        cell: ({ row }) => {
          const ev = row.original;
          const eventEndMs = ev.end_time ? new Date(ev.end_time).getTime() : new Date(ev.date_time).getTime();
          const now = Date.now();
          const isConcluded = now >= eventEndMs;
          const isWithin24hRatingWindow = isConcluded && now <= eventEndMs + 24 * 60 * 60 * 1000;
          const hoursLeftInWindow = isWithin24hRatingWindow
            ? Math.max(1, Math.ceil((eventEndMs + 24 * 60 * 60 * 1000 - now) / (1000 * 60 * 60)))
            : 0;

          return (
            <div className="flex flex-col gap-1.5 min-w-[160px] py-1" onClick={(e) => e.stopPropagation()}>
              {isConcluded ? (
                isWithin24hRatingWindow ? (
                  <button
                    onClick={() => {
                      setBroadcastEvent(ev);
                      setBroadcastInitialType("rating_request");
                      setInAppBroadcastOpen(true);
                    }}
                    className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black text-[10px] flex items-center justify-center gap-1.5 font-black rounded-xl shadow-xs animate-pulse"
                    title="Request star ratings from attendees within 24h of event completion"
                  >
                    ⭐ Request Ratings ({hoursLeftInWindow}h left)
                  </button>
                ) : (
                  <span className="text-zinc-400 text-[10px] font-bold italic tracking-wide">
                    Operations Closed
                  </span>
                )
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Scanner Link */}
                  <Link
                    href={`/scanner/${ev.id}`}
                    target="_blank"
                    className="ringer-button py-1 px-2 bg-purple-600 hover:bg-purple-700 text-white text-[9px] flex items-center gap-1 font-black rounded-lg shadow-xs"
                    title="Open live ticket scanner"
                  >
                    <QrCode className="h-3 w-3" /> Scanner
                  </Link>

                  {/* Door Staff PIN */}
                  <button
                    onClick={() => copyBouncerScannerLink(ev.id)}
                    className="ringer-button py-1 px-2 bg-zinc-800 hover:bg-zinc-900 text-white text-[9px] flex items-center gap-1 font-black rounded-lg shadow-xs"
                    title="Copy 4-digit PIN link for bouncers & door staff"
                  >
                    <Key className="h-3 w-3" /> PIN
                  </button>

                  {/* In-App Broadcast */}
                  <button
                    onClick={() => {
                      setBroadcastEvent(ev);
                      setBroadcastInitialType("general_update");
                      setInAppBroadcastOpen(true);
                    }}
                    className="ringer-button py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white text-[9px] flex items-center gap-1 font-black rounded-lg shadow-xs"
                    title="Send push broadcast to attendees"
                  >
                    <Radio className="h-3 w-3" /> Broadcast
                  </button>

                  {/* Telegram Group */}
                  <button
                    onClick={() => {
                      setTelegramEvent(ev);
                      setTelegramModalOpen(true);
                    }}
                    className="ringer-button py-1 px-2 bg-[#229ED9] hover:bg-[#1d8dc3] text-white text-[9px] flex items-center gap-1 font-black rounded-lg shadow-xs"
                    title="Connect Telegram Group"
                  >
                    <Send className="h-3 w-3" /> Telegram
                  </button>

                  {/* AI Promo Kit */}
                  <button
                    onClick={() => openPromoKit(ev)}
                    className="ringer-button py-1 px-2 bg-black hover:bg-zinc-800 text-white text-[9px] flex items-center gap-1 font-black rounded-lg shadow-xs"
                    title="Generate social media promotional text"
                  >
                    <Sparkles className="h-3 w-3 text-[#C1FF00]" /> Promo
                  </button>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "guestlist",
        header: () => <span className="font-black uppercase text-[10px] tracking-wider text-zinc-500 text-right block">Crowd & Analytics</span>,
        cell: ({ row }) => {
          const ev = row.original;
          const isExpanded = expandedEventId === ev.id;
          return (
            <div className="flex justify-end py-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                className={cn(
                  "ringer-button py-1.5 px-3 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs rounded-xl",
                  isExpanded
                    ? "bg-black text-white"
                    : "bg-zinc-100 hover:bg-zinc-200 text-black border border-black/10"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span>{isExpanded ? "Close" : "Guestlist"}</span>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          );
        },
      },
    ],
    [expandedEventId, organizerEmail, events]
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search, Filter Tabs & Controls Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Global Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search by event name, venue, city, or category..."
              className="w-full bg-zinc-50 border border-black/10 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Category Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-black tracking-wider">Category:</span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-50 border border-black/10 rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-black focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-black/5 pt-3">
          {[
            { id: "all", label: `All Events (${events.length})` },
            {
              id: "active",
              label: `Live & Upcoming (${events.filter((e) => {
                const ms = e.end_time ? new Date(e.end_time).getTime() : new Date(e.date_time).getTime();
                return Date.now() <= ms && (e.status === "approved" || e.status === "filling_fast" || e.status === "housefull");
              }).length})`,
            },
            {
              id: "past",
              label: `Concluded / Ended (${events.filter((e) => {
                const ms = e.end_time ? new Date(e.end_time).getTime() : new Date(e.date_time).getTime();
                return Date.now() > ms || e.status === "ended";
              }).length})`,
            },
            {
              id: "pending",
              label: `Pending Review (${events.filter((e) => e.status === "pending" || !e.status).length})`,
            },
            {
              id: "needs_changes",
              label: `Action Required (${events.filter((e) => e.status === "needs_changes" || e.status === "rejected").length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                statusFilter === tab.id
                  ? "bg-black text-white shadow-xs"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TanStack Table Container */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-black/5 bg-zinc-50/70">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="py-3 px-4 text-left">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-black/5">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-zinc-400">
                    <p className="text-xs font-black uppercase tracking-widest mb-1 text-black">No events match your search criteria.</p>
                    <p className="text-[11px] text-zinc-400 font-medium">Try clearing your search query or filters.</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const ev = row.original;
                  const isExpanded = expandedEventId === ev.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={cn(
                          "transition-colors cursor-pointer hover:bg-zinc-50/80",
                          isExpanded && "bg-zinc-50/90"
                        )}
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-3.5 px-4 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {/* Expanded Guestlist & Analytics Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={columns.length} className="p-0 bg-zinc-50/50 border-b border-black/10">
                            <EventGuestlistDrawer
                              eventId={ev.id}
                              title={ev.title}
                              organizerEmail={organizerEmail}
                              isPaid={ev.is_paid}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        {table.getPageCount() > 1 && (
          <div className="p-3.5 px-5 bg-zinc-50/60 border-t border-black/5 flex items-center justify-between text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({filteredData.length} events)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-black/10 bg-white hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-black/10 bg-white hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Promo Modal */}
      {promoModalOpen && promoEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPromoModalOpen(false)}>
          <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none mb-2 text-primary">✨ AI Promo Kit</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Generated exclusively for {promoEvent.title}</p>

            <div className="flex-1 overflow-y-auto mb-6 bg-zinc-50 border border-black/5 rounded-2xl p-5 custom-scrollbar">
              {promoLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 animate-pulse">Generating high-conversion social copy...</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-zinc max-w-none text-xs font-medium text-black">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-black">{promoData}</pre>
                </div>
              )}
            </div>

            <div className="flex gap-3 shrink-0">
              <button className="ringer-button flex-1 border border-black/5 hover:bg-black/5 text-black" onClick={() => setPromoModalOpen(false)}>CLOSE</button>
              <button
                className="ringer-button flex-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-30"
                onClick={() => {
                  navigator.clipboard.writeText(promoData);
                  toast.success("Promo text copied to clipboard!");
                }}
                disabled={promoLoading || !promoData}
              >
                📋 COPY TO CLIPBOARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event In-App Broadcast Modal */}
      {broadcastEvent && (
        <OrganizerEventBroadcastModal
          isOpen={inAppBroadcastOpen}
          onClose={() => setInAppBroadcastOpen(false)}
          eventId={broadcastEvent.id}
          eventTitle={broadcastEvent.title}
          organizerEmail={organizerEmail}
          eventDate={broadcastEvent.date_time}
          eventEndTime={broadcastEvent.end_time}
          initialType={broadcastInitialType}
        />
      )}

      {/* Telegram Group Modal */}
      {telegramEvent && (
        <OrganizerTelegramInviteModal
          isOpen={telegramModalOpen}
          onClose={() => setTelegramModalOpen(false)}
          eventId={telegramEvent.id}
          eventTitle={telegramEvent.title}
          organizerEmail={organizerEmail}
          initialLink={telegramEvent.whatsapp_group_link || ""}
          onLinkUpdated={() => onRefreshEvents()}
        />
      )}
    </div>
  );
}

// Sub-component for Event Guestlist & Analytics Inside the Grid
function EventGuestlistDrawer({
  eventId,
  title,
  organizerEmail,
  isPaid,
}: {
  eventId: string;
  title: string;
  organizerEmail: string;
  isPaid?: boolean;
}) {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRsvpIds, setSelectedRsvpIds] = useState<number[]>([]);
  const [issuingBulk, setIssuingBulk] = useState(false);

  React.useEffect(() => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    Promise.all([
      fetch(`${baseUrl}/api/organizer/events/${eventId}/rsvps?email=${encodeURIComponent(organizerEmail)}`).then((r) => r.json()),
      fetch(`${baseUrl}/api/organizer/events/${eventId}/analytics?email=${encodeURIComponent(organizerEmail)}`).then((r) => r.json()),
    ])
      .then(([rsvpsData, analyticsData]) => {
        if (rsvpsData.success) setRsvps(rsvpsData.data);
        if (analyticsData.success) setAnalytics(analyticsData.data);
      })
      .finally(() => setLoading(false));
  }, [eventId, organizerEmail]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400 text-xs font-black uppercase tracking-[0.2em] animate-pulse">
          Synchronizing Attendee Records & Metrics...
        </p>
      </div>
    );
  }

  if (rsvps.length === 0 && !analytics) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p className="text-xs font-bold italic">No RSVPs or activity recorded for this event yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {analytics && (
        <div>
          <h4 className="text-black font-black uppercase tracking-tighter italic mb-3 text-sm">
            Performance Metrics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-black/5 shadow-xs">
              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider mb-0.5">Total RSVPs</p>
              <p className="text-xl font-black">{analytics.totalRsvps}</p>
            </div>
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-black/5 shadow-xs">
              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider mb-0.5">Peak Day</p>
              <p className="text-xl font-black text-primary">
                {analytics.timeline && analytics.timeline.length > 0
                  ? [...analytics.timeline].sort((a, b) => b.count - a.count)[0].count
                  : 0}
              </p>
            </div>
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-black/5 shadow-xs col-span-2 md:col-span-1">
              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider mb-0.5">Avg Velocity</p>
              <p className="text-xl font-black">{analytics.avgVelocity}/day</p>
            </div>
          </div>

          {analytics.timeline && analytics.timeline.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-black/5 mb-4 shadow-xs">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                RSVP Velocity (Registrations over time)
              </h5>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.timeline}>
                    <defs>
                      <linearGradient id={`colorVibe-${eventId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C1FF00" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#C1FF00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#a1a1aa" }}
                      dy={5}
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)", padding: "6px 10px" }}
                      labelStyle={{ color: "#a1a1aa", fontSize: "9px", textTransform: "uppercase", fontWeight: 900 }}
                      itemStyle={{ color: "#000", fontWeight: 900, fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#C1FF00" strokeWidth={3} fillOpacity={1} fill={`url(#colorVibe-${eventId})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guestlist Records & Bulk Pass Issuance */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-black font-black uppercase tracking-tighter italic text-sm">
              Guestlist ({rsvps.length})
            </h4>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              • {rsvps.filter((r) => r.status === "confirmed").length} Confirmed • {rsvps.filter((r) => r.status === "pending").length} Pending
            </span>
          </div>

          {rsvps.filter((r) => r.status === "pending").length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  const pendingIds = rsvps.filter((r) => r.status === "pending").map((r) => r.id);
                  if (selectedRsvpIds.length === pendingIds.length && pendingIds.length > 0) {
                    setSelectedRsvpIds([]);
                  } else {
                    setSelectedRsvpIds(pendingIds);
                  }
                }}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-black/10 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
              >
                {selectedRsvpIds.length === rsvps.filter((r) => r.status === "pending").length && selectedRsvpIds.length > 0
                  ? "Deselect All"
                  : `Select All Pending (${rsvps.filter((r) => r.status === "pending").length})`}
              </button>

              <button
                onClick={async () => {
                  const pendingIds = rsvps.filter((r) => r.status === "pending").map((r) => r.id);
                  const targetIds = selectedRsvpIds.length > 0 ? selectedRsvpIds : pendingIds;
                  if (targetIds.length === 0) return;

                  setIssuingBulk(true);
                  try {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                    const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/rsvps/bulk-issue-pass`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: organizerEmail, rsvpIds: targetIds }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast.success(data.message || `Issued ${data.count} passes!`);
                      const issuedMap = new Map((data.data || []).map((p: any) => [p.id, p]));
                      setRsvps((prev) =>
                        prev.map((item) => {
                          if (issuedMap.has(item.id)) {
                            const updated = issuedMap.get(item.id) as any;
                            return { ...item, status: "confirmed", payment_status: updated?.payment_status || "paid", pass_code: updated?.pass_code };
                          }
                          return item;
                        })
                      );
                      setSelectedRsvpIds([]);
                    } else {
                      toast.error(data.error || "Failed to issue passes in bulk");
                    }
                  } catch (err) {
                    toast.error("Error issuing passes in bulk");
                  } finally {
                    setIssuingBulk(false);
                  }
                }}
                disabled={issuingBulk}
                className={cn(
                  "text-[10px] font-black uppercase py-1 px-3.5 rounded-full cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-transform active:scale-95",
                  selectedRsvpIds.length > 0
                    ? "bg-primary text-black hover:bg-primary/90"
                    : "bg-black text-white hover:bg-zinc-800"
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span>
                  {issuingBulk
                    ? "Issuing..."
                    : selectedRsvpIds.length > 0
                    ? `Issue Passes (${selectedRsvpIds.length})`
                    : `Issue All Pending (${rsvps.filter((r) => r.status === "pending").length})`}
                </span>
              </button>
            </div>
          )}
        </div>

        <ul className="divide-y divide-black/5 bg-white rounded-2xl border border-black/5 overflow-hidden shadow-xs">
          {rsvps.map((r, i) => (
            <li key={i} className="text-xs p-3 px-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                {r.status === "pending" && (
                  <input
                    type="checkbox"
                    checked={selectedRsvpIds.includes(r.id)}
                    onChange={() => {
                      setSelectedRsvpIds((prev) =>
                        prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                      );
                    }}
                    className="rounded border-zinc-300 text-black accent-black focus:ring-black h-4 w-4 cursor-pointer shrink-0"
                  />
                )}

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-black font-bold truncate">{r.name || "Anonymous Guest"}</span>
                    {r.status === "confirmed" ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] font-black">
                        ✓ Pass Issued {r.pass_code ? `(#${r.pass_code})` : ""}
                      </span>
                    ) : isPaid ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[8px] font-black">
                        ⏳ Pending Payment
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[8px] font-black">
                        ⏳ Awaiting Confirmation
                      </span>
                    )}
                  </div>
                  {r.user_email && <span className="text-zinc-400 text-[9px] font-medium mt-0.5 truncate">{r.user_email}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                <span className="text-zinc-400 text-[9px] font-black uppercase tracking-wider">
                  {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>

                {r.status === "pending" && (
                  <button
                    onClick={async () => {
                      try {
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                        const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/rsvps/${r.id}/issue-pass`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: organizerEmail }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast.success(data.message || "Attendee pass issued!");
                          setRsvps((prev) =>
                            prev.map((item) =>
                              item.id === r.id
                                ? { ...item, status: "confirmed", payment_status: data.data?.payment_status || "paid", pass_code: data.data?.pass_code }
                                : item
                            )
                          );
                          setSelectedRsvpIds((prev) => prev.filter((id) => id !== r.id));
                        } else {
                          toast.error(data.error || "Failed to issue pass");
                        }
                      } catch (err) {
                        toast.error("Error issuing pass");
                      }
                    }}
                    className="ringer-button bg-primary text-black hover:bg-primary/90 text-[9px] font-black uppercase py-1 px-3 rounded-full cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    {isPaid ? "Mark Paid & Issue Pass" : "Approve & Issue Pass"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
