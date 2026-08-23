"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, Shield, UserPlus, Sparkles, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";

type Admin = {
  id: string;
  email: string;
  role: "SuperAdmin" | "Editor";
  status: string;
  created_at: string;
};

export default function AdminManagementPage() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<"SuperAdmin" | "Editor">("Editor");
  const [saving, setSaving] = useState(false);

  const fetchAdmins = () => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/admin/admins`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAdmins(data.data);
        } else {
          toast.error(data.error || "Failed to fetch admins.");
        }
      })
      .catch((err) => console.error("Fetch admins error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = emailInput.trim().toLowerCase();
    if (!emailTrimmed) return;

    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed, role: roleInput }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Admin access granted to ${emailTrimmed}.`);
        setEmailInput("");
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to add admin.");
      }
    } catch (err) {
      console.error("Failed to add admin:", err);
      toast.error("Network error adding admin.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (email === session?.user?.email) {
      toast.error("You cannot revoke your own administrator privileges.");
      return;
    }

    const confirmed = await vibeConfirm({
      title: `Revoke Admin Access?`,
      message: `Are you sure you want to remove all admin and editor privileges for ${email}?`,
      confirmLabel: "Revoke Access",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/admins/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Admin privileges revoked for ${email}.`);
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to revoke admin privileges.");
      }
    } catch (err) {
      console.error("Failed to delete admin:", err);
      toast.error("Network error revoking privileges.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="border-b border-black/5 pb-12">
        <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
          Access Control
        </h1>
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
          Configuring Platform Administrators & Authorities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Add Admin Form */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="ringer-card bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Authorize New Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Email Address</Label>
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. name@domain.com"
                    required
                    className="bg-white border-black/5 rounded-xl h-12 text-sm font-bold focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Security Role</Label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as "SuperAdmin" | "Editor")}
                    className="bg-white border border-black/5 rounded-xl h-12 px-3 text-xs font-bold uppercase tracking-widest focus:ring-primary focus:border-primary w-full outline-none"
                  >
                    <option value="Editor">Editor (Manage Events)</option>
                    <option value="SuperAdmin">SuperAdmin (Full Access)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="ringer-button w-full bg-black text-white h-12 text-[10px] flex items-center justify-center gap-2 mt-4"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  {saving ? "AUTHORIZING..." : "GRANT PRIVILEGES"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Admins List */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-black text-xs font-black uppercase tracking-[0.2em]">
              Active Administrators ({admins.length})
            </h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">
                Decrypting authorities...
              </div>
            ) : admins.length === 0 ? (
              <div className="ringer-card p-12 text-center text-zinc-400 text-xs font-bold italic">
                No active administrators.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {admins.map((admin) => {
                  const isSelf = admin.email === session?.user?.email;
                  const isSuper = admin.role === "SuperAdmin";

                  return (
                    <div
                      key={admin.id}
                      className="ringer-card p-6 flex items-center justify-between hover:border-primary/30 transition-all group overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-all"></div>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-[15px] bg-zinc-50 border border-black/5 flex items-center justify-center group-hover:bg-white transition-all">
                          {isSuper ? (
                            <ShieldAlert className="h-5 w-5 text-red-500" />
                          ) : (
                            <ShieldCheck className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-black font-bold text-sm tracking-tight">{admin.email}</h3>
                            {isSelf && (
                              <span className="bg-zinc-100 text-zinc-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isSuper ? "bg-red-50 text-red-500 border border-red-100" : "bg-primary/10 text-primary border border-primary/20"
                              }`}
                            >
                              {admin.role}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                              EST. {new Date(admin.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {!isSelf && (
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                          className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
