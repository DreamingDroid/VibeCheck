"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, SlidersHorizontal, BookOpen, Clock, Calendar, User, 
  ArrowRight, X, Sparkles, Plus, Edit2, Trash2, ArrowLeft, Heart, Share2 
} from "lucide-react";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/context/ThemeContext";
import { useCity } from "@/context/CityContext";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

type Article = {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  image_url?: string | null;
  city?: string;
  created_at: string;
};

const CATEGORY_FILTERS = ["All", "General", "Events", "Tech", "Culture", "Music", "Lifestyle"];
const NEWS_CATEGORIES = ["General", "Events", "Tech", "Culture", "Music", "Lifestyle"];

const getCategoryStyle = (category: string) => {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "events":
      return { bg: "from-rose-500 to-orange-600", text: "text-white/10", grid: "linear-gradient(to right, #ffffff15 1px, transparent 1px), linear-gradient(to bottom, #ffffff15 1px, transparent 1px)" };
    case "tech":
      return { bg: "from-indigo-600 to-purple-600", text: "text-white/10", grid: "linear-gradient(to right, #ffffff15 1px, transparent 1px), linear-gradient(to bottom, #ffffff15 1px, transparent 1px)" };
    case "culture":
      return { bg: "from-emerald-500 to-teal-700", text: "text-white/10", grid: "linear-gradient(to right, #ffffff15 1px, transparent 1px), linear-gradient(to bottom, #ffffff15 1px, transparent 1px)" };
    case "music":
      return { bg: "from-fuchsia-600 to-pink-600", text: "text-white/10", grid: "linear-gradient(to right, #ffffff15 1px, transparent 1px), linear-gradient(to bottom, #ffffff15 1px, transparent 1px)" };
    case "lifestyle":
      return { bg: "from-amber-400 to-rose-500", text: "text-white/10", grid: "linear-gradient(to right, #ffffff15 1px, transparent 1px), linear-gradient(to bottom, #ffffff15 1px, transparent 1px)" };
    default:
      // Generic light background as requested
      return { bg: "from-zinc-100 to-zinc-200", text: "text-black/5", grid: "linear-gradient(to right, #00000008 1px, transparent 1px), linear-gradient(to bottom, #00000008 1px, transparent 1px)" };
  }
};



export default function LocalCurrentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isVibrant } = useTheme();
  const { currentCity, supportedCities } = useCity();

  // Auth / Permissions
  const [isEditor, setIsEditor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Preferences State
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  // Articles & Filters State
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");

  // Reader View State
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  // Theme State
  const [pageTheme, setPageTheme] = useState("default");

  // Editor Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formCity, setFormCity] = useState("Vizag");
  const [formAuthor, setFormAuthor] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formImagePublicId, setFormImagePublicId] = useState("");
  const [selectedImageBase64, setSelectedImageBase64] = useState("");
  const [formContent, setFormContent] = useState("");
  const [savingArticle, setSavingArticle] = useState(false);

  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(async () => {
    if (!currentCity) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${baseUrl}/api/news?city=${encodeURIComponent(currentCity)}`);
      const data = await res.json();
      if (data.success) {
        setArticles(data.data);
      }
    } catch (err) {}
  });

  useEffect(() => {
    if (session?.user?.email) {
      setLoadingPrefs(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data && Array.isArray(data.data.categories)) {
            setUserCategories(data.data.categories);
          }
        })
        .catch((err) => console.error("Pref load error:", err))
        .finally(() => setLoadingPrefs(false));
    } else {
      setUserCategories([]);
    }
  }, [session?.user?.email]);

  // Handle shared article ID from URL query parameters
  useEffect(() => {
    if (articles.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get("id");
      if (articleId) {
        const found = articles.find((a) => a.id === articleId);
        if (found) {
          setActiveArticle(found);
        }
      }
    }
  }, [articles]);

  // Synchronize activeArticle with URL query parameter without page reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (activeArticle) {
        if (params.get("id") !== activeArticle.id) {
          params.set("id", activeArticle.id);
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.pushState({ path: newUrl }, "", newUrl);
        }
      } else {
        if (params.has("id")) {
          params.delete("id");
          const queryStr = params.toString();
          const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
          window.history.pushState({ path: newUrl }, "", newUrl);
        }
      }
    }
  }, [activeArticle]);

  // Fetch admin/editor verification
  useEffect(() => {
    if (session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then((r) => r.json())
        .then((data) => {
          setIsAdmin(data.isAdmin || false);
          setIsEditor(data.isEditor || false);
        })
        .catch((err) => console.error("Error verifying editor role:", err))
        .finally(() => setCheckingRole(false));
    } else if (status !== "loading") {
      setCheckingRole(false);
    }
  }, [session, status]);

  const fetchArticles = () => {
    if (!currentCity) return;
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/news?city=${encodeURIComponent(currentCity)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setArticles(data.data);
        }
      })
      .catch((err) => console.error("Error fetching articles:", err))
      .finally(() => setLoading(false));
  };

  const fetchSettings = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.localCurrentsTheme) {
          setPageTheme(data.localCurrentsTheme);
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (currentCity) {
      fetchArticles();
    }
  }, [currentCity]);

  if (status === "loading" || checkingRole) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Opening Archives...</p>
        </div>
      </main>
    );
  }

  // Handle article write/edit
  const handleOpenCreateModal = () => {
    setEditingArticleId(null);
    setFormTitle("");
    setFormCategory("General");
    setFormCity(currentCity || "Vizag");
    setFormAuthor(session?.user?.name || "VibeCheck Editorial");
    setFormImageUrl("");
    setFormImagePublicId("");
    setSelectedImageBase64("");
    setFormContent("");
    setShowEditorModal(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation(); // Avoid triggering open article reader
    setEditingArticleId(article.id);
    setFormTitle(article.title);
    setFormCategory(article.category);
    setFormCity(article.city || currentCity || "Vizag");
    setFormAuthor(article.author);
    setFormImageUrl(article.image_url || "");
    setFormImagePublicId((article as any).image_public_id || "");
    setSelectedImageBase64("");
    setFormContent(article.content);
    setShowEditorModal(true);
  };

  const handleCloseModal = () => {
    setShowEditorModal(false);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent || formContent.replace(/<[^>]+>/g, '').trim() === '') {
      toast.error("Please fill in the title and content.");
      return;
    }

    const email = session?.user?.email;
    if (!email) return;

    setSavingArticle(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      let finalImageUrl = formImageUrl;
      let finalImagePublicId = formImagePublicId;

      if (selectedImageBase64) {
        toast.loading("Uploading image...", { id: "upload" });
        try {
          const uploadRes = await fetch(`${baseUrl}/api/admin/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, image: selectedImageBase64 }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.data) {
            finalImageUrl = uploadData.data.url;
            finalImagePublicId = uploadData.data.publicId;
            toast.success("Image uploaded", { id: "upload" });
          } else {
            toast.error(uploadData.error || "Image upload failed", { id: "upload" });
            setSavingArticle(false);
            return;
          }
        } catch (err) {
          toast.error("Failed to upload image", { id: "upload" });
          setSavingArticle(false);
          return;
        }
      }

      const isEditing = !!editingArticleId;
      const url = isEditing
        ? `${baseUrl}/api/admin/news/${editingArticleId}`
        : `${baseUrl}/api/admin/news`;

      const method = isEditing ? "PUT" : "POST";
      const payload = {
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        author: formAuthor.trim() || "VibeCheck Editorial",
        image_url: finalImageUrl || null,
        image_public_id: finalImagePublicId || null,
        city: formCity,
        email,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(isEditing ? "Story updated!" : "Story published!");
        setShowEditorModal(false);
        fetchArticles();
        if (activeArticle && activeArticle.id === editingArticleId) {
          // Refresh open reader content if updated
          setActiveArticle({ ...activeArticle, ...payload });
        }
      } else {
        toast.error(data.error || "Could not publish story.");
      }
    } catch (err) {
      console.error("Save news error:", err);
      toast.error("Failed to connect to server.");
    } finally {
      setSavingArticle(false);
    }
  };

  const handleDeleteArticle = async (e: React.MouseEvent, id: string, titleStr: string) => {
    e.stopPropagation(); // Avoid triggering open article reader
    const confirmed = await vibeConfirm({
      title: `Delete "${titleStr}"?`,
      message: "This will permanently delete the article. This action cannot be undone.",
      confirmLabel: "Delete story",
      variant: "danger",
    });
    if (!confirmed) return;

    const email = session?.user?.email;
    if (!email) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/news/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Story deleted successfully.");
        fetchArticles();
        if (activeArticle?.id === id) {
          setActiveArticle(null);
        }
      } else {
        toast.error(data.error || "Failed to delete article.");
      }
    } catch (err) {
      console.error("Delete article error:", err);
      toast.error("Connection failed.");
    }
  };

  // Filter & Sort Logic
  const filteredArticles = articles
    .filter((article) => {
      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All"
        ? (userCategories.length > 0 ? userCategories.includes(article.category) : true)
        : article.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === "latest" ? dateB - dateA : dateA - dateB;
    });

  // Calculate read time (rough estimate: 200 words per minute)
  const calculateReadTime = (text: string) => {
    const words = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  };

  // Hero Featured Article (only when no filter is active, otherwise show standard list)
  const featuredArticle = 
    searchQuery === "" && selectedCategory === "All" && filteredArticles.length > 0 
      ? filteredArticles[0] 
      : null;

  const regularArticles = featuredArticle 
    ? filteredArticles.slice(1) 
    : filteredArticles;

  return (
    <div className="min-h-screen bg-background pb-24 text-black font-helvetica select-none">
      {/* Pull to refresh indicator */}
      <div 
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 bg-zinc-50"
        style={{ height: isRefreshing || isPulling ? `${pullDistance}px` : '0px' }}
      >
        <div className={`flex flex-col items-center justify-center transition-opacity duration-200 ${isPulling || isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3}deg)` }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
            {isRefreshing ? 'Refreshing Stories...' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Editorial Header */}
      {pageTheme === 'news-paper' ? (
        <header className="sticky top-0 z-[100] bg-white max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2 border-b-[6px] border-black border-x border-x-black/5 shadow-md">
          <div className="border-t-[6px] border-black py-4 mb-2 relative flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="hidden md:flex flex-col items-center justify-center border-r-[4px] border-black pr-6">
              <span className="text-xl font-black uppercase tracking-tight text-primary">Est.</span>
              <span className="text-3xl font-serif font-black tracking-tighter">2026</span>
            </div>
            
            <div className="flex-1 text-center w-full relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-1">
                COMMUNITY DISPATCHES
              </p>
              <h1 className="text-[clamp(3rem,8vw,6rem)] font-serif font-black tracking-tighter uppercase leading-[0.85] mb-1 text-black">
                VIBECHECK SPACE
              </h1>
              <p className="text-black text-sm font-serif italic border-t border-black pt-2 inline-block px-12 mt-2">
                Your space for the ultimate pulse on Vizag&apos;s culture, music, tech, and coastal stories.
              </p>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center border-l-[4px] border-black pl-6">
              <span className="text-[10px] font-black uppercase tracking-tight text-primary">ACTIVE SPACES</span>
              <span className="text-3xl font-serif font-black tracking-tighter">#{filteredArticles.length}</span>
            </div>

            {/* Quick Actions */}
            {(isEditor || isAdmin) && (
              <div className="absolute top-0 right-0 md:top-2 md:right-2 z-20">
                <button
                  onClick={handleOpenCreateModal}
                  className="bg-black text-white px-4 py-2 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary hover:text-black transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  SHARE YOUR VIBE
                </button>
              </div>
            )}
          </div>
          <div className="flex justify-center items-center text-[10px] font-bold uppercase tracking-widest border-t-[4px] border-black pt-2 gap-4 text-black">
            <span className="hover:text-primary cursor-pointer transition-colors">CULTURE</span>
            <span>|</span>
            <span className="hover:text-primary cursor-pointer transition-colors">MUSIC</span>
            <span>|</span>
            <span className="hover:text-primary cursor-pointer transition-colors">TECH</span>
            <span>|</span>
            <span className="hover:text-primary cursor-pointer transition-colors">COASTAL</span>
          </div>
        </header>
      ) : (
        <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 md:pt-16 border-b border-black/5 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">
                THE VIBECHECK ARCHIVES
              </p>
              <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-[0.85] mb-3">
                LOCAL CURRENTS
              </h1>
              <p className="text-zinc-500 text-xs sm:text-sm font-normal max-w-xl">
                The ultimate pulse on Vizag&apos;s culture, music, tech, and coastal stories.
              </p>
            </div>

            {/* Quick Actions */}
            {(isEditor || isAdmin) && (
              <button
                onClick={handleOpenCreateModal}
                className="ringer-button bg-black text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 self-start md:self-end"
              >
                <Plus className="h-4 w-4 text-primary animate-pulse" />
                Write Story
              </button>
            )}
          </div>
        </header>
      )}

      {/* Guest Sign-In CTA */}
      {status === "unauthenticated" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 animate-in fade-in duration-300">
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-black/5 rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 text-center md:text-left max-w-2xl">
              <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tight flex items-center justify-center md:justify-start gap-2 text-black">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" /> Customize your Vibe
              </h3>
              <p className="text-zinc-600 text-xs sm:text-sm font-semibold leading-relaxed">
                Sign in to synchronize your local currents feed and get customized event updates. Personalizing your preferences filters your feed to match the topics you care about most.
              </p>
            </div>
            <button 
              onClick={() => signIn("google")}
              className="ringer-button bg-black hover:bg-zinc-800 text-white font-black text-xs px-6 py-4 uppercase shrink-0 transition-transform active:scale-95 shadow-md border-none"
            >
              Sign in to VibeCheck
            </button>
          </div>
        </div>
      )}

      {/* Personalized Feed Notification */}
      {status === "authenticated" && userCategories.length > 0 && selectedCategory === "All" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 animate-in fade-in duration-300">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-zinc-700">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              <span>Personalized feed active based on your preferences: <span className="text-black uppercase">{userCategories.join(", ")}</span></span>
            </div>
            <Link href="/preferences" className="text-primary hover:underline font-black uppercase tracking-wider text-[10px]">
              Edit Preferences
            </Link>
          </div>
        </div>
      )}

      {/* Interactive Filter Toolbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-50/50 p-6 rounded-[28px] border border-black/5 backdrop-blur-md">
          {/* Search bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search news, topics, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-zinc-400 text-black"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar snap-x snap-mandatory">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border snap-start shrink-0
                  ${selectedCategory === cat
                    ? "bg-black border-black text-white shadow-md scale-[1.03]"
                    : "bg-white border-black/5 text-zinc-400 hover:border-black/20 hover:text-black"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort By controls */}
          <div className="flex items-center gap-3 shrink-0">
            <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-black/5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="latest">LATEST FIRST</option>
              <option value="oldest">OLDEST FIRST</option>
            </select>
          </div>
        </div>
      </section>

      {/* Main Articles Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Scanning files...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-24 text-center bg-zinc-50/50 rounded-[32px] border border-black/5 border-dashed">
            <p className="text-zinc-400 text-sm font-semibold italic">
              No stories match your filter criteria. Try resetting search query.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {pageTheme === 'news-paper' ? (
              <div className="border border-black bg-white">
                {/* Hero Featured Article Block for Newspaper */}
                {featuredArticle && (
                  <div 
                    onClick={() => setActiveArticle(featuredArticle)}
                    className="group cursor-pointer grid grid-cols-1 md:grid-cols-12 border-b-[2px] border-black"
                  >
                    {/* Image spans 8 columns */}
                    {featuredArticle.image_url && (
                      <div className="md:col-span-8 border-b md:border-b-0 md:border-r border-black relative min-h-[50vh] md:min-h-[500px]">
                        <img src={optimizeCloudinaryUrl(featuredArticle.image_url, 'f_auto,q_auto,w_1200')} alt={featuredArticle.title} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                      </div>
                    )}
                    {/* Content spans 4 columns (or 12 if no image) */}
                    <div className={`${featuredArticle.image_url ? 'md:col-span-4' : 'md:col-span-12'} p-6 md:p-8 flex flex-col relative overflow-hidden`}>
                      <span className="text-primary text-[10px] font-black uppercase tracking-widest mb-4 z-10">
                        {featuredArticle.category} • {featuredArticle.city || "VIZAG"}
                      </span>
                      <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-serif font-black tracking-tighter uppercase leading-[0.9] mb-2 group-hover:text-primary transition-colors z-10">
                        {featuredArticle.title}
                      </h2>
                      <span className="text-xs font-serif italic mb-6 block text-zinc-600 z-10">
                        By {featuredArticle.author}
                      </span>
                      <div className="text-left md:text-justify text-sm font-serif leading-relaxed line-clamp-6 mb-6 z-10">
                        <span className="float-left text-6xl font-black font-serif mr-3 leading-[0.8]">{featuredArticle.content.replace(/<[^>]+>/g, '').charAt(0)}</span>
                        {featuredArticle.content.replace(/<[^>]+>/g, '').substring(1)}
                      </div>
                      <div className="mt-auto pt-6 border-t border-black flex justify-between items-center text-[10px] font-black uppercase tracking-widest z-10">
                        <span>{new Date(featuredArticle.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Read <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Regular Articles Grid for Newspaper */}
                {regularArticles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                    {regularArticles.map((article, idx) => (
                      <div
                        key={article.id}
                        onClick={() => setActiveArticle(article)}
                        className={`group cursor-pointer flex flex-row md:flex-col items-center md:items-start p-4 md:p-6 border-b border-black ${idx % 4 !== 3 ? 'lg:border-r' : ''} ${idx % 3 !== 2 ? 'md:border-r lg:border-r-0' : ''}`}
                      >
                        {article.image_url && (
                          <div className="w-24 h-24 md:w-full md:h-48 shrink-0 relative border border-black mb-0 md:mb-4 mr-4 md:mr-0 overflow-hidden">
                            <img src={optimizeCloudinaryUrl(article.image_url, 'f_auto,q_auto,w_800')} alt={article.title} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col justify-between w-full h-full">
                          <div>
                            <span className="text-primary text-[9px] font-black uppercase tracking-widest mb-1 block">
                              {article.category}
                            </span>
                            <h3 className="text-lg md:text-xl font-serif font-black uppercase tracking-tighter leading-[1.0] group-hover:text-primary transition-colors line-clamp-3 md:line-clamp-4 mb-2">
                              {article.title}
                            </h3>
                            <span className="text-[10px] font-serif italic block text-zinc-600 md:mb-2">
                              By {article.author}
                            </span>
                            <p className="hidden md:block text-left md:text-justify text-xs font-serif leading-relaxed line-clamp-3">
                              {article.content.replace(/<[^>]+>/g, '')}
                            </p>
                          </div>
                          <div className="hidden md:flex mt-4 pt-3 border-t border-black/10 justify-between items-center text-[9px] font-black uppercase tracking-widest">
                            <span>{new Date(article.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Hero Featured Article Block */}
                {featuredArticle && (
                  <div 
                    onClick={() => setActiveArticle(featuredArticle)}
                    className="group cursor-pointer bg-white rounded-[32px] border border-black/5 overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 grid grid-cols-1 lg:grid-cols-12 gap-0 relative"
                  >
                    {/* Banner panel - Category Gradient */}
                    <div className={`lg:col-span-4 h-64 sm:h-96 lg:min-h-[350px] bg-gradient-to-br ${getCategoryStyle(featuredArticle.category).bg} overflow-hidden relative flex items-center justify-center`}>
                      {featuredArticle.image_url ? (
                        <img src={optimizeCloudinaryUrl(featuredArticle.image_url, 'f_auto,q_auto,w_1200')} alt={featuredArticle.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-[size:24px_24px]" style={{ backgroundImage: getCategoryStyle(featuredArticle.category).grid }} />
                          <div className={`absolute -bottom-6 -right-6 text-[80px] font-black uppercase ${getCategoryStyle(featuredArticle.category).text} select-none pointer-events-none tracking-tighter italic`}>
                            {featuredArticle.category}
                          </div>
                        </>
                      )}
                      {/* Category Sticker overlay */}
                      <div className="absolute top-6 left-6 flex gap-2">
                        <span className="sticker-badge bg-black text-white">
                          FEATURED • {featuredArticle.category.toUpperCase()}
                        </span>
                        {featuredArticle.city && (
                          <span className="sticker-badge bg-primary text-white font-bold">
                            {featuredArticle.city.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Panel */}
                    <div className="lg:col-span-8 p-8 sm:p-12 flex flex-col justify-between space-y-8 bg-white relative">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> 
                            {new Date(featuredArticle.created_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric"
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {calculateReadTime(featuredArticle.content)}
                          </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black italic tracking-tighter uppercase leading-[1.0] group-hover:text-primary transition-colors">
                          {featuredArticle.title}
                        </h2>

                        <p className="text-zinc-600 text-sm font-normal leading-relaxed line-clamp-4">
                          {featuredArticle.content.replace(/<[^>]+>/g, '')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-black/5">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center border border-black/5 font-black text-xs">
                            {featuredArticle.author.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                            {featuredArticle.author}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {(isEditor || isAdmin) && (
                            <div className="flex items-center gap-1.5 mr-2">
                              <button
                                onClick={(e) => handleOpenEditModal(e, featuredArticle)}
                                className="h-8 w-8 rounded-full flex items-center justify-center border border-black/5 text-zinc-400 hover:text-black hover:bg-zinc-50 transition-all bg-white"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteArticle(e, featuredArticle.id, featuredArticle.title)}
                                className="h-8 w-8 rounded-full flex items-center justify-center border border-transparent text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all bg-white"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          <span className="text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform duration-300">
                            Read Story <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid Layout for Regular Articles */}
                {regularArticles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {regularArticles.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => setActiveArticle(article)}
                        className="group cursor-pointer bg-white rounded-[28px] border border-black/5 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col justify-between h-[360px]"
                      >
                        {/* Header Banner - Compact Category Gradient */}
                        <div className={`h-40 bg-gradient-to-br ${getCategoryStyle(article.category).bg} overflow-hidden relative shrink-0 flex items-center justify-center`}>
                          {article.image_url ? (
                            <img src={optimizeCloudinaryUrl(article.image_url, 'f_auto,q_auto,w_800')} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[size:16px_16px]" style={{ backgroundImage: getCategoryStyle(article.category).grid }} />
                              <div className={`absolute -bottom-4 -right-4 text-[40px] font-black uppercase ${getCategoryStyle(article.category).text} select-none pointer-events-none tracking-tighter italic`}>
                                {article.category}
                              </div>
                            </>
                          )}
                          {/* Category and City tags */}
                          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                            <span className="sticker-badge bg-black text-white py-0.5 px-2 text-[8px]">
                              {article.category.toUpperCase()}
                            </span>
                            {article.city && (
                              <span className="sticker-badge bg-primary text-white py-0.5 px-2 text-[8px] font-bold">
                                {article.city.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Content body */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> 
                                {new Date(article.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {calculateReadTime(article.content)}
                              </span>
                            </div>

                            <h3 className="text-base font-black uppercase italic tracking-tighter leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title}
                            </h3>

                            <p className="text-zinc-600 text-xs font-normal leading-relaxed line-clamp-2">
                              {article.content.replace(/<[^>]+>/g, '')}
                            </p>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-black/5 mt-3 shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 truncate max-w-[120px]">
                              By {article.author}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {(isEditor || isAdmin) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => handleOpenEditModal(e, article)}
                                    className="h-7 w-7 rounded-full flex items-center justify-center border border-black/5 text-zinc-400 hover:text-black hover:bg-zinc-50 transition-all bg-white"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteArticle(e, article.id, article.title)}
                                    className="h-7 w-7 rounded-full flex items-center justify-center border border-transparent text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all bg-white"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}

                              <span className="text-[9px] font-black uppercase tracking-widest text-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Read <ArrowRight className="h-2.5 w-2.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Reader Mode Full-Screen Slide-Over / Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-end animate-in fade-in duration-300">
          {/* Backdrop click closer */}
          <div className="absolute inset-0" onClick={() => setActiveArticle(null)} />

          {/* Reader Panel */}
          <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header controls sticky */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between z-20">
              <button
                onClick={() => setActiveArticle(null)}
                className="flex items-center gap-2 text-zinc-500 hover:text-black text-xs font-black uppercase tracking-widest transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to News
              </button>

              <div className="flex items-center gap-3">
                {(isEditor || isAdmin) && (
                  <button
                    onClick={(e) => {
                      handleOpenEditModal(e, activeArticle);
                    }}
                    className="px-4 py-2 rounded-full border border-black/5 hover:bg-zinc-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Story
                  </button>
                )}

                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/local-currents?id=${activeArticle.id}`;
                    if (navigator.share) {
                      navigator.share({
                        title: activeArticle.title,
                        text: activeArticle.content.substring(0, 100) + "...",
                        url: shareUrl
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success("Article link copied to clipboard!");
                    }
                  }}
                  className="p-2 hover:bg-black/5 rounded-full transition-all text-zinc-500 hover:text-black"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>

                <button
                  onClick={() => setActiveArticle(null)}
                  className="p-2 hover:bg-black/5 rounded-full transition-all text-zinc-500 hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Banner Cover - Category Gradient */}
            <div className={`h-48 sm:h-64 w-full relative shrink-0 bg-gradient-to-br ${getCategoryStyle(activeArticle.category).bg} flex items-center justify-center overflow-hidden`}>
              {activeArticle.image_url ? (
                <img src={optimizeCloudinaryUrl(activeArticle.image_url, 'f_auto,q_auto,w_1200')} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[size:24px_24px]" style={{ backgroundImage: getCategoryStyle(activeArticle.category).grid }} />
                  <div className={`absolute -bottom-6 -right-6 text-[80px] font-black uppercase ${getCategoryStyle(activeArticle.category).text} select-none pointer-events-none tracking-tighter italic`}>
                    {activeArticle.category}
                  </div>
                </>
              )}
              <div className="absolute bottom-6 left-6 flex gap-2">
                <span className="sticker-badge bg-black text-white py-0.5 px-2 text-[8px]">
                  {activeArticle.category.toUpperCase()}
                </span>
                {activeArticle.city && (
                  <span className="sticker-badge bg-primary text-white py-0.5 px-2 text-[8px] font-bold">
                    {activeArticle.city.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Article Content container */}
            <article className="px-6 sm:px-12 py-8 space-y-6 max-w-4xl mx-auto flex-1 pb-24">
              {/* Title */}
              <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.95] text-black pt-4">
                {activeArticle.title}
              </h1>

              {/* Meta information */}
              <div className="flex items-center gap-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-y border-black/5 py-4 my-6">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Published by {activeArticle.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> 
                  {new Date(activeArticle.created_at).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric"
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {calculateReadTime(activeArticle.content)}
                </span>
              </div>

              {/* Full Content */}
              <div className="text-zinc-800 text-sm sm:text-base font-normal leading-relaxed font-helvetica pt-2 space-y-4 quill-content">
                {activeArticle.content.trim().startsWith('<') ? (
                  <div dangerouslySetInnerHTML={{ __html: activeArticle.content }} />
                ) : (
                  activeArticle.content.split("\n").map((para, i) => {
                    if (!para.trim()) return <div key={i} className="h-4" />;
                    return (
                      <p key={i} className="leading-relaxed">
                        {para}
                      </p>
                    );
                  })
                )}
              </div>

              {/* Footer Vibe Check logo signature */}
              <div className="border-t border-black/5 pt-12 mt-16 text-center space-y-2">
                <img src="/logo.png" alt="VibeCheck Logo" className="h-8 w-8 mx-auto object-contain filter grayscale opacity-40" />
                <p className="text-[9px] text-zinc-400 font-black tracking-[0.2em] uppercase">VIBECHECK EDITORIAL DIVISION</p>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* Editor Modal for Write/Edit Story */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white rounded-[32px] border border-black/5 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-black/5 mb-6">
              <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {editingArticleId ? "Modify News Story" : "Compose Editorial Piece"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-black/5 rounded-full transition-all text-zinc-400 hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveArticle} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Metadata */}
              <div className="lg:col-span-5 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Title</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Vizag Beachfront Clean-up Drive Organised"
                    required
                    className="bg-zinc-50 border-black/5 rounded-xl h-12 text-sm font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Category</Label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-black/5 bg-zinc-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {NEWS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">City</Label>
                    <select
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-black/5 bg-zinc-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {supportedCities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Author Identity</Label>
                    <Input
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      placeholder="VibeCheck Editorial"
                      className="bg-zinc-50 border-black/5 rounded-xl h-12 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 flex items-center gap-1">Editorial Image</Label>
                  <div className="flex flex-col gap-3">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("Image size must be less than 5MB");
                            e.target.value = "";
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => setSelectedImageBase64(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="bg-zinc-50 border-black/5 rounded-xl h-10 text-xs font-bold pt-2 cursor-pointer"
                    />
                    {(selectedImageBase64 || formImageUrl) && (
                      <div className="relative h-40 w-full rounded-xl overflow-hidden border border-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedImageBase64 || formImageUrl} alt="Preview" className="object-cover w-full h-full" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImageBase64("");
                            setFormImageUrl("");
                            setFormImagePublicId("");
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4 border-t border-black/5">
                  <button
                    type="submit"
                    disabled={savingArticle}
                    className="ringer-button flex-1 bg-black text-white h-12 text-[10px] flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    {savingArticle ? "SAVING..." : editingArticleId ? "UPDATE STORY" : "PUBLISH STORY"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="ringer-button bg-zinc-200 text-black h-12 text-[10px] px-6"
                  >
                    CLOSE
                  </button>
                </div>
              </div>

              {/* Right Column: Full-Height Content Body Textarea */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-2">Content Body</Label>
                <ReactQuill 
                  theme="snow"
                  value={formContent}
                  onChange={setFormContent}
                  placeholder="Draft the editorial narrative here..."
                  className="bg-white rounded-2xl flex-1 min-h-[350px]"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
