"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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

const getCategoryGradient = (category: string) => {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "events":
      return "from-rose-500 to-orange-600";
    case "tech":
      return "from-indigo-600 to-purple-600";
    case "culture":
      return "from-emerald-500 to-teal-700";
    case "music":
      return "from-fuchsia-600 to-pink-600";
    case "lifestyle":
      return "from-amber-400 to-rose-500";
    default:
      return "from-zinc-800 to-zinc-950";
  }
};

const formatParagraphWithDropCap = (text: string) => {
  if (!text) return "";
  const match = text.match(/[a-zA-Z]/);
  if (!match || match.index === undefined) {
    return text;
  }
  const index = match.index;
  const before = text.slice(0, index);
  const letter = text[index];
  const after = text.slice(index + 1);
  
  return (
    <>
      {before}
      <span className="font-black text-lg sm:text-xl text-black inline-block">{letter}</span>
      {after}
    </>
  );
};

export default function NewsRoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isVibrant } = useTheme();
  const { currentCity, supportedCities } = useCity();

  // Auth / Permissions
  const [isEditor, setIsEditor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Articles & Filters State
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");

  // Reader View State
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  // Editor Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formCity, setFormCity] = useState("Vizag");
  const [formAuthor, setFormAuthor] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formContent, setFormContent] = useState("");
  const [savingArticle, setSavingArticle] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("google", { callbackUrl: window.location.href });
    }
  }, [status]);

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

  // Fetch news articles
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

  useEffect(() => {
    if (status === "authenticated" && currentCity) {
      fetchArticles();
    }
  }, [status, currentCity]);

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

  if (status === "unauthenticated") {
    return null;
  }

  // Handle article write/edit
  const handleOpenCreateModal = () => {
    setEditingArticleId(null);
    setFormTitle("");
    setFormCategory("General");
    setFormCity(currentCity || "Vizag");
    setFormAuthor(session?.user?.name || "VibeCheck Editorial");
    setFormImageUrl("");
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
    setFormContent(article.content);
    setShowEditorModal(true);
  };

  const handleCloseModal = () => {
    setShowEditorModal(false);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("Please fill in the title and content.");
      return;
    }

    const email = session?.user?.email;
    if (!email) return;

    setSavingArticle(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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
        image_url: null,
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
      const matchesCategory = selectedCategory === "All" || article.category === selectedCategory;
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
      {/* Editorial Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 md:pt-16 border-b border-black/5 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">
              THE VIBECHECK ARCHIVES
            </p>
            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-[0.85] mb-3">
              NEWSROOM
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
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border
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
            {/* Hero Featured Article Block */}
            {featuredArticle && (
              <div 
                onClick={() => setActiveArticle(featuredArticle)}
                className="group cursor-pointer bg-white rounded-[32px] border border-black/5 overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 grid grid-cols-1 lg:grid-cols-12 gap-0 relative"
              >
                {/* Banner panel - Category Gradient */}
                <div className={`lg:col-span-4 h-64 sm:h-96 lg:min-h-[350px] bg-gradient-to-br ${getCategoryGradient(featuredArticle.category)} overflow-hidden relative flex items-center justify-center`}>
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
                  <div className="absolute -bottom-8 -right-8 text-[120px] font-black uppercase text-white/5 select-none pointer-events-none tracking-tighter italic">
                    {featuredArticle.category}
                  </div>
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

                    <p className="text-zinc-600 text-sm font-semibold leading-relaxed line-clamp-4">
                      {featuredArticle.content}
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
                    <div className={`h-20 bg-gradient-to-br ${getCategoryGradient(article.category)} overflow-hidden relative shrink-0 flex items-center justify-center`}>
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" />
                      <div className="absolute -bottom-4 -right-4 text-[40px] font-black uppercase text-white/5 select-none pointer-events-none tracking-tighter italic">
                        {article.category}
                      </div>
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

                        <p className="text-zinc-500 text-xs font-semibold leading-relaxed line-clamp-2">
                          {article.content}
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
                    const shareUrl = `${window.location.origin}/newsroom?id=${activeArticle.id}`;
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
            <div className={`h-48 sm:h-64 w-full relative bg-gradient-to-br ${getCategoryGradient(activeArticle.category)} flex items-center justify-center overflow-hidden`}>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="absolute -bottom-6 -right-6 text-[80px] font-black uppercase text-white/5 select-none pointer-events-none tracking-tighter italic">
                {activeArticle.category}
              </div>
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

              {/* Full Content (premium Helvetica, high line height, clean zinc colors) */}
              <div className="text-zinc-800 text-sm sm:text-base font-normal leading-relaxed font-helvetica pt-2 space-y-4">
                {activeArticle.content.split("\n").map((para, i) => {
                  if (!para.trim()) return <div key={i} className="h-4" />;
                  return (
                    <p key={i} className="leading-relaxed">
                      {formatParagraphWithDropCap(para)}
                    </p>
                  );
                })}
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

                {/* Image state preserved in payload as null, input omitted */}

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
                <Textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Draft the editorial narrative here..."
                  required
                  className="bg-zinc-50 border-black/5 rounded-2xl p-4 text-sm font-semibold leading-relaxed focus:bg-white flex-1 min-h-[350px] lg:h-full resize-y lg:resize-none"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
