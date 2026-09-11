"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Search, Users, Calendar, Shield, Download, RefreshCw, 
  ExternalLink, Eye, Phone, Mail, MapPin, Tag, CheckCircle2, 
  XCircle, Clock, DollarSign, Filter, ChevronRight, Copy, Check,
  Sparkles, Radio, MessageSquare, Ticket, UserCheck, Star, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const CATEGORIES = ["Sports", "Arts", "Education", "Spiritual", "Music", "Food", "Wellness", "Indie", "Techno", "General"];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") || "";
  const urlTab = searchParams.get("tab") || "all";

  const [activeTab, setActiveTab] = useState<"all" | "organizers" | "attendees" | "events">(
    (urlTab as any) || "all"
  );
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [orgStatus, setOrgStatus] = useState("all");
  const [orgSortBy, setOrgSortBy] = useState("created_at");

  const [attPlatform, setAttPlatform] = useState("all");
  const [attCity, setAttCity] = useState("all");
  const [attCategory, setAttCategory] = useState("all");
  const [attHasRsvps, setAttHasRsvps] = useState(false);
  const [attSortBy, setAttSortBy] = useState("created_at");

  const [evCategory, setEvCategory] = useState("All");
  const [evStatus, setEvStatus] = useState("all");
  const [evCity, setEvCity] = useState("all");
  const [evIsPaid, setEvIsPaid] = useState("all");
  const [evTimeframe, setEvTimeframe] = useState("all");
  const [evSortBy, setEvSortBy] = useState("date_time");

  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  // Data States
  const [globalData, setGlobalData] = useState<{
    summaryCounts: { organizers: number; attendees: number; events: number; total: number };
    organizers: { total: number; data: any[] };
    attendees: { total: number; data: any[] };
    events: { total: number; data: any[] };
  } | null>(null);

  const [organizersList, setOrganizersList] = useState<{ total: number; data: any[] }>({ total: 0, data: [] });
  const [attendeesList, setAttendeesList] = useState<{ total: number; data: any[] }>({ total: 0, data: [] });
  const [eventsList, setEventsList] = useState<{ total: number; data: any[] }>({ total: 0, data: [] });

  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Deep Details Modal State
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    type: "organizer" | "attendee" | "event" | null;
    idOrEmail: string | null;
    extraParam?: string;
    loading: boolean;
    data: any | null;
  }>({
    isOpen: false,
    type: null,
    idOrEmail: null,
    loading: false,
    data: null
  });

  // Copied State Tracker
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load available cities
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/cities`)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setAvailableCities(d.data.map((c: any) => c.name));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch search data whenever filters or queries change
  const executeSearch = () => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const params = new URLSearchParams();

    if (debouncedQuery.trim()) {
      params.set("q", debouncedQuery.trim());
    }

    if (activeTab === "all") {
      params.set("type", "all");
      fetch(`${baseUrl}/api/admin/search?${params.toString()}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setGlobalData({
              summaryCounts: d.summaryCounts,
              organizers: d.organizers,
              attendees: d.attendees,
              events: d.events
            });
          }
        })
        .catch(err => {
          console.error("Search error:", err);
          toast.error("Failed to execute universal search.");
        })
        .finally(() => setLoading(false));
      return;
    }

    if (activeTab === "organizers") {
      params.set("type", "organizers");
      if (orgStatus !== "all") params.set("status", orgStatus);
      params.set("sortBy", orgSortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "100");

      fetch(`${baseUrl}/api/admin/search?${params.toString()}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setOrganizersList({ total: d.total, data: d.data });
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to fetch organizers.");
        })
        .finally(() => setLoading(false));
      return;
    }

    if (activeTab === "attendees") {
      params.set("type", "attendees");
      if (attPlatform !== "all") params.set("platform", attPlatform);
      if (attCity !== "all") params.set("city", attCity);
      if (attCategory !== "all") params.set("category", attCategory);
      if (attHasRsvps) params.set("hasRsvps", "true");
      params.set("sortBy", attSortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "100");

      fetch(`${baseUrl}/api/admin/search?${params.toString()}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setAttendeesList({ total: d.total, data: d.data });
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to fetch attendees.");
        })
        .finally(() => setLoading(false));
      return;
    }

    if (activeTab === "events") {
      params.set("type", "events");
      if (evCategory !== "All") params.set("category", evCategory);
      if (evStatus !== "all") params.set("status", evStatus);
      if (evCity !== "all") params.set("city", evCity);
      if (evIsPaid !== "all") params.set("isPaid", evIsPaid);
      if (evTimeframe !== "all") params.set("timeframe", evTimeframe);
      params.set("sortBy", evSortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "100");

      fetch(`${baseUrl}/api/admin/search?${params.toString()}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setEventsList({ total: d.total, data: d.data });
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to fetch events.");
        })
        .finally(() => setLoading(false));
      return;
    }
  };

  useEffect(() => {
    executeSearch();
  }, [
    activeTab, 
    debouncedQuery, 
    orgStatus, 
    orgSortBy, 
    attPlatform, 
    attCity, 
    attCategory, 
    attHasRsvps, 
    attSortBy, 
    evCategory, 
    evStatus, 
    evCity, 
    evIsPaid, 
    evTimeframe, 
    evSortBy, 
    sortOrder
  ]);

  // Handle Tab Switch
  const handleTabChange = (tab: "all" | "organizers" | "attendees" | "events") => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tab);
    if (searchQuery) newParams.set("q", searchQuery);
    router.replace(`/admin/search?${newParams.toString()}`);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setOrgStatus("all");
    setOrgSortBy("created_at");
    setAttPlatform("all");
    setAttCity("all");
    setAttCategory("all");
    setAttHasRsvps(false);
    setAttSortBy("created_at");
    setEvCategory("All");
    setEvStatus("all");
    setEvCity("all");
    setEvIsPaid("all");
    setEvTimeframe("all");
    setEvSortBy("date_time");
    setSortOrder("DESC");
    toast.success("All search filters reset.");
  };

  // Open Deep Inspector
  const openInspector = async (type: "organizer" | "attendee" | "event", idOrEmail: string, extraParam?: string) => {
    setDetailModal({
      isOpen: true,
      type,
      idOrEmail,
      extraParam,
      loading: true,
      data: null
    });

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      let endpoint = "";
      if (type === "organizer") {
        endpoint = `${baseUrl}/api/admin/search/organizer-details?email=${encodeURIComponent(idOrEmail)}`;
      } else if (type === "attendee") {
        const queryParams = new URLSearchParams();
        if (idOrEmail.includes("@")) queryParams.set("email", idOrEmail);
        else queryParams.set("phone", idOrEmail);
        if (extraParam) queryParams.set("phone", extraParam);
        endpoint = `${baseUrl}/api/admin/search/attendee-details?${queryParams.toString()}`;
      } else if (type === "event") {
        endpoint = `${baseUrl}/api/admin/search/event-details?id=${encodeURIComponent(idOrEmail)}`;
      }

      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.success) {
        setDetailModal(prev => ({ ...prev, loading: false, data: json.data }));
      } else {
        toast.error("Failed to load detailed record.");
        setDetailModal(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while inspecting record.");
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteOrganizer = async (id: string, name: string) => {
    const confirmed = await vibeConfirm({
      title: `Delete Organizer "${name}"?`,
      message: "This action will permanently delete this organizer profile and revoke all their organizer privileges. This action cannot be undone.",
      confirmLabel: "Delete Permanently",
      variant: "danger",
    });
    if (!confirmed) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const r = await fetch(`${baseUrl}/api/admin/organizers/${id}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Organizer "${name}" deleted.`);
        setDetailModal(prev => ({ ...prev, isOpen: false }));
        executeSearch();
      } else {
        toast.error(d.error || "Failed to delete organizer.");
      }
    } catch (err) {
      console.error("Delete organizer error:", err);
      toast.error("An error occurred while deleting organizer.");
    }
  };

  const handleDeleteEvent = async (id: string, titleStr: string) => {
    const confirmed = await vibeConfirm({
      title: `Delete Event "${titleStr}"?`,
      message: "This action is permanent and cannot be undone. All RSVPs for this event will also be removed.",
      confirmLabel: "Delete Permanently",
      variant: "danger",
    });
    if (!confirmed) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${baseUrl}/api/admin/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Event "${titleStr}" deleted.`);
        setDetailModal(prev => ({ ...prev, isOpen: false }));
        executeSearch();
      } else {
        toast.error(data.error || "Failed to delete event.");
      }
    } catch (err) {
      console.error("Delete event error:", err);
      toast.error("Failed to delete event.");
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    let rows: any[] = [];
    let filename = `vibecheck_export_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;

    if (activeTab === "organizers") {
      rows = organizersList.data.map(o => ({
        "Brand Name": o.brand_name || "N/A",
        "Email": o.email,
        "Phone": o.phone_number || "N/A",
        "Status": o.status,
        "Rating": o.rating || "N/A",
        "Events Count": o.events_count || 0,
        "Approved Events": o.approved_events_count || 0,
        "Total RSVPs": o.total_rsvps || 0,
        "Followers": o.followers_count || 0,
        "Joined At": o.created_at ? new Date(o.created_at).toLocaleDateString() : "N/A"
      }));
    } else if (activeTab === "attendees") {
      rows = attendeesList.data.map(a => ({
        "Name": a.name || "N/A",
        "Email": a.email || "N/A",
        "Phone": a.phone_number || "N/A",
        "Platform": a.platform,
        "City": a.city || "N/A",
        "Profession": a.profession || "N/A",
        "Age Group": a.age_group || "N/A",
        "Interests": Array.isArray(a.categories) ? a.categories.join("; ") : "",
        "Total RSVPs": a.rsvp_count || 0,
        "Followed Organizers": a.following_count || 0,
        "Created At": a.created_at ? new Date(a.created_at).toLocaleDateString() : "N/A"
      }));
    } else if (activeTab === "events") {
      rows = eventsList.data.map(e => ({
        "Title": e.title,
        "Category": e.category,
        "City": e.city || "N/A",
        "Location": e.location || "N/A",
        "Date & Time": e.date_time ? new Date(e.date_time).toLocaleString() : "N/A",
        "Status": e.status,
        "Is Paid": e.is_paid ? "Paid" : "Free",
        "Organizer Email": e.organizer_email || "N/A",
        "Organizer Name": e.organizer_name || "N/A",
        "RSVP Count": e.rsvp_count || 0,
        "Participant Limit": e.participant_limit || "Unlimited"
      }));
    } else {
      toast.info("Please switch to Organizers, Attendees, or Events tab to export tailored CSV.");
      return;
    }

    if (rows.length === 0) {
      toast.error("No data available to export.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        headers.map(header => {
          const val = row[header] ?? "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${rows.length} records to ${filename}`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-black uppercase tracking-widest">
              SUPERADMIN PORTAL
            </Badge>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Live Database Access</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-black flex items-center gap-3">
            Database Search & Explorer
          </h1>
          <p className="text-zinc-500 text-xs font-medium mt-1">
            Search keywords and apply multi-criteria filters across all Organizers, Attendees, and Events records in PostgreSQL.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="rounded-xl border-black/10 text-[10px] font-black uppercase tracking-wider hover:bg-black/5 text-zinc-600 gap-1.5 h-9"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>

          {activeTab !== "all" && (
            <Button
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl bg-black text-white hover:bg-zinc-800 text-[10px] font-black uppercase tracking-wider gap-1.5 shadow-sm h-9"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Main Search Input & Mode Tabs */}
      <div className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-black transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, brand, city, phone, event title, description, or keyword..."
            className="pl-12 pr-28 py-6 rounded-2xl bg-white border-black/10 shadow-sm text-sm font-semibold text-black placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:border-black transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-12 pr-2 flex items-center text-xs font-black text-zinc-400 hover:text-black uppercase tracking-wider"
            >
              Clear
            </button>
          )}
          {loading && (
            <div className="absolute inset-y-0 right-4 flex items-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Navigation Tabs with Dynamic Counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-black/5">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "all"
                ? "bg-black text-white shadow-sm"
                : "text-zinc-500 hover:bg-black/5 hover:text-black bg-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            All Results
            {globalData && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "all" ? "bg-primary text-black" : "bg-zinc-100 text-zinc-700"
              }`}>
                {globalData.summaryCounts.total}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("organizers")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "organizers"
                ? "bg-black text-white shadow-sm"
                : "text-zinc-500 hover:bg-black/5 hover:text-black bg-white"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            Organizers
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "organizers" ? "bg-primary text-black" : "bg-zinc-100 text-zinc-700"
            }`}>
              {activeTab === "organizers" ? organizersList.total : (globalData?.summaryCounts.organizers ?? 0)}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("attendees")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "attendees"
                ? "bg-black text-white shadow-sm"
                : "text-zinc-500 hover:bg-black/5 hover:text-black bg-white"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            Attendees & Users
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "attendees" ? "bg-primary text-black" : "bg-zinc-100 text-zinc-700"
            }`}>
              {activeTab === "attendees" ? attendeesList.total : (globalData?.summaryCounts.attendees ?? 0)}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("events")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "events"
                ? "bg-black text-white shadow-sm"
                : "text-zinc-500 hover:bg-black/5 hover:text-black bg-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-purple-500" />
            Events
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "events" ? "bg-primary text-black" : "bg-zinc-100 text-zinc-700"
            }`}>
              {activeTab === "events" ? eventsList.total : (globalData?.summaryCounts.events ?? 0)}
            </span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS TOOLBAR (Tab Specific) */}
      {activeTab !== "all" && (
        <Card className="ringer-card bg-white p-4 sm:p-5 border-black/5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 mr-2">
              <Filter className="h-3.5 w-3.5" /> Filters:
            </div>

            {/* ORGANIZERS FILTERS */}
            {activeTab === "organizers" && (
              <>
                <div className="w-36 sm:w-44">
                  <Select value={orgStatus} onValueChange={(val) => val && setOrgStatus(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-40 sm:w-48">
                  <Select value={orgSortBy} onValueChange={(val) => val && setOrgSortBy(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date Joined</SelectItem>
                      <SelectItem value="brand_name">Brand Name</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="events_count">Events Hosted</SelectItem>
                      <SelectItem value="total_rsvps">Total RSVPs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ATTENDEES FILTERS */}
            {activeTab === "attendees" && (
              <>
                <div className="w-36 sm:w-44">
                  <Select value={attPlatform} onValueChange={(val) => val && setAttPlatform(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="web">Web Only</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                      <SelectItem value="linked">Linked (Web + WA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 sm:w-44">
                  <Select value={attCity} onValueChange={(val) => val && setAttCity(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {availableCities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 sm:w-44">
                  <Select value={attCategory} onValueChange={(val) => val && setAttCategory(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Category Interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Interests</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttHasRsvps(!attHasRsvps)}
                  className={`rounded-xl text-xs font-bold h-9 transition-colors ${
                    attHasRsvps ? "bg-black text-white border-black" : "border-black/10 text-zinc-600"
                  }`}
                >
                  <Ticket className="h-3.5 w-3.5 mr-1.5" />
                  Has RSVPs
                </Button>

                <div className="w-36 sm:w-44">
                  <Select value={attSortBy} onValueChange={(val) => val && setAttSortBy(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Joined Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="rsvp_count">RSVP Count</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* EVENTS FILTERS */}
            {activeTab === "events" && (
              <>
                <div className="w-36 sm:w-44">
                  <Select value={evCategory} onValueChange={(val) => val && setEvCategory(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 sm:w-44">
                  <Select value={evStatus} onValueChange={(val) => val && setEvStatus(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="approved">Approved / Live</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="housefull">Housefull</SelectItem>
                      <SelectItem value="filling_fast">Filling Fast</SelectItem>
                      <SelectItem value="needs_changes">Needs Changes</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 sm:w-44">
                  <Select value={evCity} onValueChange={(val) => val && setEvCity(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {availableCities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32 sm:w-36">
                  <Select value={evIsPaid} onValueChange={(val) => val && setEvIsPaid(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Pricing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pricing</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 sm:w-44">
                  <Select value={evTimeframe} onValueChange={(val) => val && setEvTimeframe(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                      <SelectItem value="this_week">Next 7 Days</SelectItem>
                      <SelectItem value="this_month">Next 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 sm:w-44">
                  <Select value={evSortBy} onValueChange={(val) => val && setEvSortBy(val)}>
                    <SelectTrigger className="rounded-xl border-black/10 text-xs font-bold h-9">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_time">Event Date</SelectItem>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="rsvp_count">RSVP Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Sort Order Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(prev => prev === "ASC" ? "DESC" : "ASC")}
              className="rounded-xl text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-black h-9 px-3"
            >
              {sortOrder === "ASC" ? "↑ Ascending" : "↓ Descending"}
            </Button>
          </div>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW: ALL RESULTS SUMMARY */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "all" && globalData && (
        <div className="space-y-8">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card 
              onClick={() => handleTabChange("organizers")}
              className="ringer-card bg-white p-6 cursor-pointer hover:border-black/20 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Organizers</span>
                  <div className="text-3xl font-black italic tracking-tighter text-black mt-1">
                    {globalData.summaryCounts.organizers}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 text-[11px] font-bold text-blue-600 flex items-center gap-1 group-hover:underline">
                Explore all organizers <ChevronRight className="h-3 w-3" />
              </div>
            </Card>

            <Card 
              onClick={() => handleTabChange("attendees")}
              className="ringer-card bg-white p-6 cursor-pointer hover:border-black/20 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Attendees</span>
                  <div className="text-3xl font-black italic tracking-tighter text-black mt-1">
                    {globalData.summaryCounts.attendees}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 text-[11px] font-bold text-emerald-600 flex items-center gap-1 group-hover:underline">
                Explore all attendees <ChevronRight className="h-3 w-3" />
              </div>
            </Card>

            <Card 
              onClick={() => handleTabChange("events")}
              className="ringer-card bg-white p-6 cursor-pointer hover:border-black/20 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Events</span>
                  <div className="text-3xl font-black italic tracking-tighter text-black mt-1">
                    {globalData.summaryCounts.events}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 text-[11px] font-bold text-purple-600 flex items-center gap-1 group-hover:underline">
                Explore all events <ChevronRight className="h-3 w-3" />
              </div>
            </Card>
          </div>

          {/* Section 1: Organizers Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black uppercase tracking-tight italic flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Organizers Matching Search ({globalData.organizers.total})
              </h2>
              {globalData.organizers.total > 0 && (
                <button
                  onClick={() => handleTabChange("organizers")}
                  className="text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-black flex items-center gap-1"
                >
                  View all {globalData.organizers.total} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {globalData.organizers.data.length === 0 ? (
              <p className="text-xs font-medium text-zinc-400 italic p-6 bg-white rounded-2xl border border-black/5 text-center">
                No organizers match your query.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalData.organizers.data.slice(0, 6).map((org) => (
                  <Card key={org.id} className="ringer-card bg-white p-5 flex flex-col justify-between hover:border-black/20 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-black text-sm text-black truncate">
                          {org.brand_name || "Unnamed Brand"}
                        </div>
                        <Badge className={`text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          org.status === "approved" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          org.status === "pending_approval" ? "bg-amber-100 text-amber-800 border-amber-200" :
                          "bg-rose-100 text-rose-800 border-rose-200"
                        }`}>
                          {org.status}
                        </Badge>
                      </div>
                      <div className="text-xs font-medium text-zinc-500 truncate mb-1">{org.email}</div>
                      {org.phone_number && (
                        <div className="text-xs font-mono text-zinc-400 mb-3">{org.phone_number}</div>
                      )}
                    </div>
                    <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-zinc-500">
                        {org.events_count || 0} Events • {org.total_rsvps || 0} RSVPs
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInspector("organizer", org.email)}
                          className="rounded-xl text-[10px] font-black uppercase tracking-wider h-7 px-2.5"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Inspect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteOrganizer(org.id, org.brand_name || org.email)}
                          className="rounded-xl text-[10px] font-black uppercase tracking-wider h-7 w-7 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 border-black/10"
                          title="Delete Organizer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Attendees Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black uppercase tracking-tight italic flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                Attendees Matching Search ({globalData.attendees.total})
              </h2>
              {globalData.attendees.total > 0 && (
                <button
                  onClick={() => handleTabChange("attendees")}
                  className="text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-black flex items-center gap-1"
                >
                  View all {globalData.attendees.total} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {globalData.attendees.data.length === 0 ? (
              <p className="text-xs font-medium text-zinc-400 italic p-6 bg-white rounded-2xl border border-black/5 text-center">
                No attendees match your query.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalData.attendees.data.slice(0, 6).map((att, idx) => (
                  <Card key={idx} className="ringer-card bg-white p-5 flex flex-col justify-between hover:border-black/20 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-black text-sm text-black truncate">
                          {att.name || "Attendee"}
                        </div>
                        <Badge className="bg-zinc-100 text-zinc-800 text-[9px] font-black uppercase tracking-wider shrink-0">
                          {att.platform}
                        </Badge>
                      </div>
                      <div className="text-xs font-medium text-zinc-500 truncate mb-1">
                        {att.email || "No email on record"}
                      </div>
                      {att.phone_number && (
                        <div className="text-xs font-mono text-zinc-400 mb-2">{att.phone_number}</div>
                      )}
                      {att.city && (
                        <div className="text-[11px] font-bold text-zinc-500 flex items-center gap-1 mb-2">
                          <MapPin className="h-3 w-3 text-zinc-400" /> {att.city}
                        </div>
                      )}
                    </div>
                    <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-zinc-500">
                        {att.rsvp_count || 0} RSVPs
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInspector("attendee", att.email || att.phone_number, att.phone_number)}
                        className="rounded-xl text-[10px] font-black uppercase tracking-wider h-7 px-2.5"
                      >
                        <Eye className="h-3 w-3 mr-1" /> Inspect
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Events Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black uppercase tracking-tight italic flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                Events Matching Search ({globalData.events.total})
              </h2>
              {globalData.events.total > 0 && (
                <button
                  onClick={() => handleTabChange("events")}
                  className="text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-black flex items-center gap-1"
                >
                  View all {globalData.events.total} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {globalData.events.data.length === 0 ? (
              <p className="text-xs font-medium text-zinc-400 italic p-6 bg-white rounded-2xl border border-black/5 text-center">
                No events match your query.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalData.events.data.slice(0, 6).map((ev) => (
                  <Card key={ev.id} className="ringer-card bg-white p-5 flex flex-col justify-between hover:border-black/20 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-black text-sm text-black line-clamp-1">
                          {ev.title}
                        </div>
                        <Badge className="bg-purple-100 text-purple-800 text-[9px] font-black uppercase tracking-wider shrink-0">
                          {ev.category}
                        </Badge>
                      </div>
                      <div className="text-xs font-bold text-zinc-600 flex items-center gap-1 mb-1">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        {new Date(ev.date_time).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric"
                        })}
                      </div>
                      <div className="text-xs text-zinc-500 line-clamp-2 mb-3">
                        {ev.location ? `${ev.location} • ` : ""}{ev.city || "Global"}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-zinc-500">
                        {ev.rsvp_count || 0} RSVPs • {ev.is_paid ? "Paid" : "Free"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInspector("event", ev.id)}
                          className="rounded-xl text-[10px] font-black uppercase tracking-wider h-7 px-2.5"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Inspect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEvent(ev.id, ev.title)}
                          className="rounded-xl text-[10px] font-black uppercase tracking-wider h-7 w-7 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 border-black/10"
                          title="Delete Event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW: ORGANIZERS TAB */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "organizers" && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-zinc-500">
            Showing {organizersList.data.length} of {organizersList.total} registered organizers
          </div>

          {organizersList.data.length === 0 ? (
            <Card className="ringer-card bg-white p-12 text-center border-black/5">
              <Shield className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-black uppercase tracking-wider text-black">No Organizers Found</p>
              <p className="text-xs text-zinc-500 mt-1">Try adjusting your keyword or status filters.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-black/5">
                  <tr>
                    <th className="p-4">Brand / Organizer</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Events</th>
                    <th className="p-4">RSVPs</th>
                    <th className="p-4">Followers</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-medium">
                  {organizersList.data.map((org) => (
                    <tr key={org.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-black text-sm">{org.brand_name || "Unnamed Brand"}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">ID: {org.id.substring(0, 8)}...</div>
                      </td>
                      <td className="p-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-zinc-600">
                          <Mail className="h-3 w-3 text-zinc-400" />
                          <span>{org.email}</span>
                          <button
                            onClick={() => copyToClipboard(org.email, "Email", `org-email-${org.id}`)}
                            className="text-zinc-400 hover:text-black"
                          >
                            {copiedKey === `org-email-${org.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        {org.phone_number && (
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                            <Phone className="h-3 w-3 text-zinc-400" />
                            <span>{org.phone_number}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={`text-[9px] font-black uppercase tracking-wider ${
                          org.status === "approved" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          org.status === "pending_approval" ? "bg-amber-100 text-amber-800 border-amber-200" :
                          "bg-rose-100 text-rose-800 border-rose-200"
                        }`}>
                          {org.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 font-bold text-zinc-700">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          {org.rating || "4.5"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-black">{org.events_count || 0}</div>
                        <div className="text-[10px] text-zinc-400">{org.approved_events_count || 0} live</div>
                      </td>
                      <td className="p-4 font-bold text-black">
                        {org.total_rsvps || 0}
                      </td>
                      <td className="p-4 font-bold text-black">
                        {org.followers_count || 0}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openInspector("organizer", org.email)}
                            className="rounded-xl text-[10px] font-black uppercase tracking-wider h-8 px-3"
                          >
                            <Eye className="h-3 w-3 mr-1" /> Inspect
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteOrganizer(org.id, org.brand_name || org.email)}
                            className="rounded-xl text-[10px] font-black uppercase tracking-wider h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 border-black/10"
                            title="Delete Organizer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW: ATTENDEES TAB */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "attendees" && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-zinc-500">
            Showing {attendeesList.data.length} of {attendeesList.total} attendees & platform users
          </div>

          {attendeesList.data.length === 0 ? (
            <Card className="ringer-card bg-white p-12 text-center border-black/5">
              <Users className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-black uppercase tracking-wider text-black">No Attendees Found</p>
              <p className="text-xs text-zinc-500 mt-1">Try searching by email, phone, city, or interest category.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-black/5">
                  <tr>
                    <th className="p-4">Attendee Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Platform</th>
                    <th className="p-4">City</th>
                    <th className="p-4">Interests</th>
                    <th className="p-4">RSVPs</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-medium">
                  {attendeesList.data.map((att, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-black text-sm">{att.name || "Anonymous Guest"}</div>
                        {att.profession && (
                          <div className="text-[10px] text-zinc-400">{att.profession}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {att.email ? (
                          <div className="flex items-center gap-1.5 text-zinc-600">
                            <span>{att.email}</span>
                            <button
                              onClick={() => copyToClipboard(att.email, "Email", `att-email-${idx}`)}
                              className="text-zinc-400 hover:text-black"
                            >
                              {copiedKey === `att-email-${idx}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-300 italic">None</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-zinc-600">
                        {att.phone_number ? (
                          <div className="flex items-center gap-1.5">
                            <span>{att.phone_number}</span>
                            <button
                              onClick={() => copyToClipboard(att.phone_number, "Phone", `att-phone-${idx}`)}
                              className="text-zinc-400 hover:text-black"
                            >
                              {copiedKey === `att-phone-${idx}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-300 italic">None</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={`text-[9px] font-black uppercase tracking-wider ${
                          att.platform === "linked" ? "bg-purple-100 text-purple-800 border-purple-200" :
                          att.platform === "web" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          "bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}>
                          {att.platform}
                        </Badge>
                      </td>
                      <td className="p-4 text-zinc-600">
                        {att.city || <span className="text-zinc-300 italic">Not set</span>}
                      </td>
                      <td className="p-4 max-w-[200px]">
                        {Array.isArray(att.categories) && att.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {att.categories.slice(0, 3).map((c: string, cIdx: number) => (
                              <span key={cIdx} className="bg-zinc-100 text-zinc-700 text-[9px] px-1.5 py-0.5 rounded-md font-semibold">
                                {c}
                              </span>
                            ))}
                            {att.categories.length > 3 && (
                              <span className="text-[9px] text-zinc-400 font-bold">+{att.categories.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-300 italic">None</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-black">
                        {att.rsvp_count || 0}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInspector("attendee", att.email || att.phone_number, att.phone_number)}
                          className="rounded-xl text-[10px] font-black uppercase tracking-wider h-8 px-3"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW: EVENTS TAB */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-zinc-500">
            Showing {eventsList.data.length} of {eventsList.total} events
          </div>

          {eventsList.data.length === 0 ? (
            <Card className="ringer-card bg-white p-12 text-center border-black/5">
              <Calendar className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-black uppercase tracking-wider text-black">No Events Found</p>
              <p className="text-xs text-zinc-500 mt-1">Try adjusting category, city, or status filters.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-black/5">
                  <tr>
                    <th className="p-4">Event Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Location / City</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Pricing</th>
                    <th className="p-4">Organizer</th>
                    <th className="p-4">RSVPs</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-medium">
                  {eventsList.data.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4 max-w-[240px]">
                        <div className="font-bold text-black text-sm truncate">{ev.title}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">ID: {ev.id.substring(0, 8)}...</div>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-purple-100 text-purple-800 text-[9px] font-black uppercase tracking-wider border-purple-200">
                          {ev.category}
                        </Badge>
                      </td>
                      <td className="p-4 text-zinc-600 whitespace-nowrap">
                        <div className="font-bold">
                          {new Date(ev.date_time).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {new Date(ev.date_time).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-600 max-w-[180px]">
                        <div className="font-semibold truncate">{ev.city || "Global"}</div>
                        {ev.location && (
                          <div className="text-[11px] text-zinc-400 truncate">{ev.location}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={`text-[9px] font-black uppercase tracking-wider ${
                          ev.status === "approved" || !ev.status ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          ev.status === "pending" ? "bg-amber-100 text-amber-800 border-amber-200" :
                          ev.status === "housefull" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          ev.status === "filling_fast" ? "bg-orange-100 text-orange-800 border-orange-200" :
                          ev.status === "needs_changes" ? "bg-indigo-100 text-indigo-800 border-indigo-200" :
                          "bg-rose-100 text-rose-800 border-rose-200"
                        }`}>
                          {ev.status || "approved"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={`text-[9px] font-black uppercase tracking-wider ${
                          ev.is_paid ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-zinc-100 text-zinc-700"
                        }`}>
                          {ev.is_paid ? "Paid" : "Free"}
                        </Badge>
                      </td>
                      <td className="p-4 text-zinc-600 max-w-[180px]">
                        <div className="font-bold truncate">{ev.organizer_name || "VibeCheck Admin"}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{ev.organizer_email}</div>
                      </td>
                      <td className="p-4 font-bold text-black">
                        {ev.rsvp_count || 0}
                        {ev.participant_limit && (
                          <span className="text-zinc-400 text-[10px] font-normal ml-1">/ {ev.participant_limit}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openInspector("event", ev.id)}
                            className="rounded-xl text-[10px] font-black uppercase tracking-wider h-8 px-3"
                          >
                            <Eye className="h-3 w-3 mr-1" /> Inspect
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteEvent(ev.id, ev.title)}
                            className="rounded-xl text-[10px] font-black uppercase tracking-wider h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 border-black/10"
                            title="Delete Event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DEEP RECORD INSPECTOR MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog 
        open={detailModal.isOpen} 
        onOpenChange={(open) => !open && setDetailModal(prev => ({ ...prev, isOpen: false }))}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white border-black/10">
          {detailModal.loading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Deep Record Details...</p>
            </div>
          ) : !detailModal.data ? (
            <div className="py-12 text-center text-zinc-400 text-xs font-bold">
              Failed to load record details.
            </div>
          ) : (
            <div className="space-y-6">
              {/* ORGANIZER DEEP INSPECTOR */}
              {detailModal.type === "organizer" && (
                <div className="space-y-6">
                  <DialogHeader className="border-b border-black/5 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase tracking-wider">
                        ORGANIZER RECORD
                      </Badge>
                      <Badge className={`text-[9px] font-black uppercase tracking-wider ${
                        detailModal.data.organizer.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                        detailModal.data.organizer.status === "pending_approval" ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {detailModal.data.organizer.status}
                      </Badge>
                    </div>
                    <DialogTitle className="text-2xl font-black italic tracking-tight uppercase text-black">
                      {detailModal.data.organizer.brand_name || "Unnamed Brand"}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-zinc-500">
                      Registered Email: {detailModal.data.organizer.email}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Profile Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-4 rounded-2xl border border-black/5 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Phone Number</span>
                      <span className="font-mono font-bold text-black">{detailModal.data.organizer.phone_number || "None"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Platform Rating</span>
                      <div className="flex items-center gap-1 font-bold text-black">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        {detailModal.data.organizer.rating || "4.5"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Joined Date</span>
                      <span className="font-semibold text-black">
                        {detailModal.data.organizer.created_at ? new Date(detailModal.data.organizer.created_at).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Bio / Description */}
                  {detailModal.data.organizer.description && (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Brand Description</span>
                      <p className="text-xs text-zinc-700 bg-zinc-50 p-3.5 rounded-xl border border-black/5 leading-relaxed">
                        {detailModal.data.organizer.description}
                      </p>
                    </div>
                  )}

                  {/* Hosted Events List */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                      Hosted Events ({detailModal.data.events.length})
                    </span>
                    {detailModal.data.events.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No events created by this organizer yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {detailModal.data.events.map((ev: any) => (
                          <div key={ev.id} className="p-3 bg-zinc-50 rounded-xl border border-black/5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-black">{ev.title}</div>
                              <div className="text-[10px] text-zinc-400">
                                {ev.category} • {new Date(ev.date_time).toLocaleDateString()} • {ev.city || "Global"}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-zinc-200 text-zinc-800 text-[9px] font-black uppercase">
                                {ev.rsvp_count || 0} RSVPs
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Followers */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                      Followers ({detailModal.data.followers.length})
                    </span>
                    {detailModal.data.followers.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No followers yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detailModal.data.followers.map((fol: any, i: number) => (
                          <span key={i} className="text-[11px] bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-lg font-medium">
                            {fol.name || fol.user_email}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div className="pt-4 border-t border-black/5 flex justify-end">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteOrganizer(detailModal.data.organizer.id, detailModal.data.organizer.brand_name || detailModal.data.organizer.email)}
                      className="rounded-xl text-[10px] font-black uppercase tracking-wider h-9 px-4 flex items-center gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Organizer
                    </Button>
                  </div>
                </div>
              )}

              {/* ATTENDEE DEEP INSPECTOR */}
              {detailModal.type === "attendee" && (
                <div className="space-y-6">
                  <DialogHeader className="border-b border-black/5 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                        ATTENDEE RECORD
                      </Badge>
                      <Badge className="bg-zinc-100 text-zinc-800 text-[9px] font-black uppercase tracking-wider">
                        {detailModal.data.webUser && detailModal.data.whatsappUser ? "LINKED USER" :
                         detailModal.data.webUser ? "WEB USER" : "WHATSAPP USER"}
                      </Badge>
                    </div>
                    <DialogTitle className="text-2xl font-black italic tracking-tight uppercase text-black">
                      {detailModal.data.webUser?.name || detailModal.data.whatsappUser?.name || "Attendee Profile"}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-zinc-500">
                      Email: {detailModal.data.webUser?.email || "No email linked"} • Phone: {detailModal.data.webUser?.phone_number || detailModal.data.whatsappUser?.phone_number || "No phone linked"}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Demographic & Location Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-4 rounded-2xl border border-black/5 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">City</span>
                      <span className="font-bold text-black">{detailModal.data.webUser?.city || detailModal.data.whatsappUser?.preferences?.city || "Not Set"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Profession</span>
                      <span className="font-bold text-black">{detailModal.data.webUser?.profession || detailModal.data.whatsappUser?.preferences?.profession || "Not Set"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Age Group</span>
                      <span className="font-bold text-black">{detailModal.data.webUser?.age_group || detailModal.data.whatsappUser?.preferences?.age_group || "Not Set"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Total RSVPs</span>
                      <span className="font-black text-emerald-600">{detailModal.data.rsvps?.length || 0}</span>
                    </div>
                  </div>

                  {/* Interests / Categories */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Interest Categories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(detailModal.data.webUser?.categories || detailModal.data.whatsappUser?.preferences?.categories || []).map((cat: string, i: number) => (
                        <span key={i} className="bg-primary/20 text-black border border-primary/30 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* RSVP History */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                      Event RSVP History ({detailModal.data.rsvps?.length || 0})
                    </span>
                    {(!detailModal.data.rsvps || detailModal.data.rsvps.length === 0) ? (
                      <p className="text-xs text-zinc-400 italic">No RSVPs on record for this attendee.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {detailModal.data.rsvps.map((rsvp: any) => (
                          <div key={rsvp.id} className="p-3 bg-zinc-50 rounded-xl border border-black/5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-black">{rsvp.event_title}</div>
                              <div className="text-[10px] text-zinc-400">
                                {rsvp.event_category} • {new Date(rsvp.event_date).toLocaleDateString()} • {rsvp.event_city || "Global"}
                              </div>
                              {rsvp.pass_code && (
                                <div className="text-[10px] font-mono font-bold text-primary mt-0.5">
                                  PASS CODE: {rsvp.pass_code}
                                </div>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              <Badge className={`text-[9px] font-black uppercase ${
                                rsvp.rsvp_status === "confirmed" ? "bg-emerald-100 text-emerald-800" :
                                rsvp.rsvp_status === "cancelled" ? "bg-rose-100 text-rose-800" :
                                "bg-amber-100 text-amber-800"
                              }`}>
                                {rsvp.rsvp_status}
                              </Badge>
                              <div className="text-[9px] font-black uppercase text-zinc-400">
                                {rsvp.payment_status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Followed Organizers */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                      Followed Organizers ({detailModal.data.followedOrganizers?.length || 0})
                    </span>
                    {(!detailModal.data.followedOrganizers || detailModal.data.followedOrganizers.length === 0) ? (
                      <p className="text-xs text-zinc-400 italic">Not following any organizers.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detailModal.data.followedOrganizers.map((fol: any, i: number) => (
                          <span key={i} className="text-[11px] bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-lg font-bold border border-black/5">
                            {fol.brand_name || fol.organizer_email}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EVENT DEEP INSPECTOR */}
              {detailModal.type === "event" && (
                <div className="space-y-6">
                  <DialogHeader className="border-b border-black/5 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-purple-100 text-purple-800 text-[9px] font-black uppercase tracking-wider">
                        {detailModal.data.event.category}
                      </Badge>
                      <Badge className={`text-[9px] font-black uppercase tracking-wider ${
                        detailModal.data.event.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                        detailModal.data.event.status === "pending" ? "bg-amber-100 text-amber-800" :
                        "bg-zinc-100 text-zinc-800"
                      }`}>
                        {detailModal.data.event.status || "approved"}
                      </Badge>
                      <Badge className={`text-[9px] font-black uppercase tracking-wider ${
                        detailModal.data.event.is_paid ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-700"
                      }`}>
                        {detailModal.data.event.is_paid ? "Paid" : "Free"}
                      </Badge>
                    </div>
                    <DialogTitle className="text-2xl font-black italic tracking-tight uppercase text-black">
                      {detailModal.data.event.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-zinc-500">
                      Organizer: {detailModal.data.event.organizer_name || "VibeCheck Admin"} ({detailModal.data.event.organizer_email})
                    </DialogDescription>
                  </DialogHeader>

                  {/* Event Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-4 rounded-2xl border border-black/5 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Date & Time</span>
                      <span className="font-bold text-black">
                        {new Date(detailModal.data.event.date_time).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">City / Venue</span>
                      <span className="font-bold text-black">
                        {detailModal.data.event.city || "Global"} • {detailModal.data.event.location || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">RSVP Capacity</span>
                      <span className="font-black text-black">
                        {detailModal.data.rsvps?.length || 0} / {detailModal.data.event.participant_limit || "Unlimited"}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">Description</span>
                    <p className="text-xs text-zinc-700 bg-zinc-50 p-3.5 rounded-xl border border-black/5 leading-relaxed">
                      {detailModal.data.event.description}
                    </p>
                  </div>

                  {/* RSVPs Guest List */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                      Attendee Guest List ({detailModal.data.rsvps?.length || 0})
                    </span>
                    {(!detailModal.data.rsvps || detailModal.data.rsvps.length === 0) ? (
                      <p className="text-xs text-zinc-400 italic">No RSVPs for this event yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {detailModal.data.rsvps.map((guest: any) => (
                          <div key={guest.id} className="p-3 bg-zinc-50 rounded-xl border border-black/5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-black">{guest.attendee_name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                {guest.user_email || guest.phone_number}
                              </div>
                              {guest.pass_code && (
                                <div className="text-[10px] font-mono font-bold text-emerald-600 mt-0.5">
                                  PASS: {guest.pass_code}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge className="bg-zinc-200 text-zinc-800 text-[9px] font-black uppercase">
                                {guest.status}
                              </Badge>
                              <div className="text-[9px] font-bold text-zinc-400 mt-0.5">
                                {new Date(guest.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div className="pt-4 border-t border-black/5 flex justify-end">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEvent(detailModal.data.event.id, detailModal.data.event.title)}
                      className="rounded-xl text-[10px] font-black uppercase tracking-wider h-9 px-4 flex items-center gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Event
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
