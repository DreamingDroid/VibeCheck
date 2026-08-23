"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Newspaper, Sparkles, User, Tag, Image, FileText } from "lucide-react";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";
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

const NEWS_CATEGORIES = ["General", "Events", "Tech", "Culture", "Music", "Lifestyle"];

export default function AdminNewsPage() {
  const { data: session } = useSession();
  const { currentCity, supportedCities } = useCity();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [city, setCity] = useState("Vizag");
  const [author, setAuthor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentCity) {
      setCity(currentCity);
    }
  }, [currentCity]);

  const fetchArticles = () => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/news`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setArticles(data.data);
      })
      .catch((err) => console.error("Fetch articles error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleEditClick = (article: Article) => {
    setEditingArticleId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setCity(article.city || currentCity || "Vizag");
    setAuthor(article.author);
    setImageUrl(article.image_url || "");
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetForm = () => {
    setEditingArticleId(null);
    setTitle("");
    setContent("");
    setCategory("General");
    setCity(currentCity || "Vizag");
    setAuthor("");
    setImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and Content are required.");
      return;
    }

    const email = session?.user?.email;
    if (!email) {
      toast.error("You must be logged in with permissions.");
      return;
    }

    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const isEditing = !!editingArticleId;
      const url = isEditing
        ? `${baseUrl}/api/admin/news/${editingArticleId}`
        : `${baseUrl}/api/admin/news`;

      const method = isEditing ? "PUT" : "POST";
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        author: author.trim() || "VibeCheck Editorial",
        image_url: null,
        city,
        email,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(isEditing ? "Article updated." : "Article created!");
        handleResetForm();
        fetchArticles();
      } else {
        toast.error(data.error || "Failed to save article.");
      }
    } catch (err) {
      console.error("Save article error:", err);
      toast.error("Failed to connect to the backend server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, titleStr: string) => {
    const confirmed = await vibeConfirm({
      title: `Delete "${titleStr}"?`,
      message: "This news article will be permanently removed from all feeds. This action is irreversible.",
      confirmLabel: "Delete permanently",
      variant: "danger",
    });
    if (!confirmed) return;

    const email = session?.user?.email;
    if (!email) {
      toast.error("You must be authenticated.");
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/news/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${titleStr}" deleted.`);
        fetchArticles();
      } else {
        toast.error(data.error || "Failed to delete article.");
      }
    } catch (err) {
      console.error("Delete article error:", err);
      toast.error("Connection failed.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="border-b border-black/5 pb-12">
        <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
          NewsRoom Control
        </h1>
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
          Publish, edit and curation of VibeCheck Editorial stories
        </p>
      </div>

      <div className="space-y-12">
        {/* Editor Form - Full Width CMS Layout */}
        <Card className="ringer-card bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              {editingArticleId ? "Modify Story" : "Craft New Story"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Metadata Inputs */}
              <div className="lg:col-span-5 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Madhurawada Surf Festival Returns"
                    required
                    className="bg-white border-black/5 rounded-xl h-12 text-sm font-bold placeholder:text-zinc-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Category</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-black/5 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-black/5 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {supportedCities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Author</Label>
                    <Input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="VibeCheck Editorial"
                      className="bg-white border-black/5 rounded-xl h-12 text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Image state preserved in payload as null, input omitted */}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="ringer-button flex-1 bg-black text-white h-12 text-[10px] flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    {saving ? "SAVING..." : editingArticleId ? "UPDATE PIECE" : "PUBLISH PIECE"}
                  </button>
                  {editingArticleId && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="ringer-button bg-zinc-200 text-black h-12 text-[10px] px-4"
                    >
                      CANCEL
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Full-Height Content Body Textarea */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-2">Content Body</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the full editorial piece here..."
                  required
                  className="bg-white border-black/5 rounded-2xl p-4 text-sm font-semibold leading-relaxed placeholder:text-zinc-400 focus:ring-primary focus:border-primary flex-1 min-h-[350px] lg:h-full resize-y lg:resize-none"
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Stories List */}
        <div className="space-y-6">
          <h2 className="text-black text-xs font-black uppercase tracking-[0.2em] px-1">
            Published Articles ({articles.length})
          </h2>

          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">
                Fetching archives...
              </div>
            ) : articles.length === 0 ? (
              <div className="ringer-card p-12 text-center text-zinc-400 text-xs font-bold italic bg-white">
                No articles published yet. Publish your first piece today!
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="ringer-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 transition-all bg-white overflow-hidden relative group"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br ${getCategoryGradient(article.category)} flex items-center justify-center shrink-0 border border-black/5 overflow-hidden relative`}>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter scale-75">
                          {article.category.substring(0, 3)}
                        </span>
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="sticker-badge bg-black text-white py-0.5 px-2.5 text-[9px]">
                            {article.category}
                          </span>
                          {article.city && (
                            <span className="sticker-badge bg-primary text-white py-0.5 px-2.5 text-[9px] font-bold">
                              {article.city}
                            </span>
                          )}
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                            <User className="h-2.5 w-2.5" /> {article.author}
                          </span>
                        </div>
                        <h3 className="text-black font-black uppercase italic tracking-tighter text-lg leading-tight md:text-xl truncate pr-4">
                          {article.title}
                        </h3>
                        <p className="text-zinc-500 text-xs font-medium line-clamp-2 pr-6">
                          {article.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleEditClick(article)}
                        className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-black hover:bg-zinc-100 transition-all border border-black/5"
                        title="Edit Article"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(article.id, article.title)}
                        className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                        title="Delete Article"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
