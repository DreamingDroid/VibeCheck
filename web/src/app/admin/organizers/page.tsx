"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, CheckCircle2, XCircle, ChevronDown, ChevronUp, 
  Mail, Phone, Calendar, ExternalLink 
} from "lucide-react";
import { toast } from "sonner";

type Organizer = {
  id: string;
  email: string;
  brand_name?: string;
  description?: string;
  phone_number?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  status: string;
  created_at?: string;
};

function AdminOrganizersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabParam || "approved");
  const [requests, setRequests] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Sync tab state from URL parameter
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const loadRequests = () => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const url = activeTab === "pending" 
      ? `${baseUrl}/api/admin/organizers/pending`
      : `${baseUrl}/api/admin/organizers`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRequests(d.data);
        } else {
          toast.error("Failed to load organizer registry.");
        }
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to connect to administrative services.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
    setExpandedId(null);
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/admin/organizers?tab=${tabId}`);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const r = await fetch(`${baseUrl}/api/admin/organizers/${id}/approve`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        toast.success("Organizer application approved successfully.");
        loadRequests();
      } else {
        toast.error("Failed to approve organizer application.");
      }
    } catch (err) {
      toast.error("An error occurred during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.id || !rejectionReason) return;
    setActionLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const r = await fetch(`${baseUrl}/api/admin/organizers/${rejectModal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Organizer application rejected.");
        setRejectModal({ isOpen: false, id: null });
        setRejectionReason("");
        loadRequests();
      } else {
        toast.error("Failed to reject application.");
      }
    } catch (err) {
      toast.error("An error occurred during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-black/5 pb-10">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
            Organizer Registry
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            Partner Networks & Application Verification
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 no-scrollbar">
        {[
          { id: "approved", label: "Active Organizers" },
          { id: "pending", label: "Pending Review" },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-black text-white shadow-md"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organizers List */}
      <div className="space-y-6 pb-20">
        <h2 className="text-black text-xs font-black uppercase tracking-[0.2em] px-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-400" />
          {activeTab === "approved" && "Active Organizers"}
          {activeTab === "pending" && "Pending Review"}
          <span className="text-zinc-400 ml-1">({requests.length})</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">
            Scanning credentials databases...
          </div>
        ) : requests.length === 0 ? (
          <div className="ringer-card p-20 text-center text-zinc-400 text-xs font-bold italic">
            No organizers found in this registry filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {requests.map(req => {
              const isExpanded = expandedId === req.id;
              return (
                <div
                  key={req.id}
                  className={cn(
                    "ringer-card group bg-white border-black/5 p-6 hover:shadow-xl transition-all flex flex-col gap-6 cursor-pointer",
                    isExpanded && "border-primary/50 shadow-lg"
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  {/* Top Header Row (always visible) */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={cn(
                          "sticker-badge px-3 flex items-center gap-1",
                          activeTab === "pending" ? "bg-orange-500 text-white" : "bg-black text-white"
                        )}>
                          {activeTab === "pending" ? "PENDING" : "APPROVED"}
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">
                          {req.brand_name || req.email}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-primary" /> {req.email}
                        </span>
                        {req.phone_number && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-primary" /> {req.phone_number}
                          </span>
                        )}
                        {req.created_at && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-primary" /> REGISTERED: {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse Indicator */}
                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                      {!isExpanded ? (
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-black flex items-center gap-1.5">
                          SHOW DETAILS <ChevronDown className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                          HIDE DETAILS <ChevronUp className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="border-t border-black/5 pt-6 space-y-6 animate-in fade-in duration-300" onClick={e => e.stopPropagation()}>
                      {/* Description */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Organizer Profile</h4>
                        <p className="text-sm font-semibold text-zinc-800 leading-relaxed whitespace-pre-wrap">
                          {req.description || "No profile description provided."}
                        </p>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 p-6 rounded-[24px] border border-black/5 text-xs font-bold text-zinc-600">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">primary email coordinates</span>
                            <span className="text-zinc-800 font-black select-all">{req.email}</span>
                          </div>
                          {req.phone_number && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">contact frequencies</span>
                              <span className="text-zinc-800 font-black select-all">{req.phone_number}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {req.social_links?.instagram && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">instagram linkage</span>
                              <a href={req.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-black flex items-center gap-1.5 break-all">
                                <ExternalLink className="h-3.5 w-3.5" /> {req.social_links.instagram}
                              </a>
                            </div>
                          )}
                          {req.social_links?.facebook && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">facebook linkage</span>
                              <a href={req.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-black flex items-center gap-1.5 break-all">
                                <ExternalLink className="h-3.5 w-3.5" /> {req.social_links.facebook}
                              </a>
                            </div>
                          )}
                          {req.social_links?.twitter && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">twitter linkage</span>
                              <a href={req.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-black flex items-center gap-1.5 break-all">
                                <ExternalLink className="h-3.5 w-3.5" /> {req.social_links.twitter}
                              </a>
                            </div>
                          )}
                          {req.social_links?.website && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">website portal</span>
                              <a href={req.social_links.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-black flex items-center gap-1.5 break-all">
                                <ExternalLink className="h-3.5 w-3.5" /> {req.social_links.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons inside expanded card */}
                      {activeTab === "pending" && (
                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-black/5">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading}
                            className="ringer-button bg-primary text-black text-[10px] flex items-center gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" /> APPROVE APPLICANT
                          </button>
                          <button
                            onClick={() => setRejectModal({ isOpen: true, id: req.id })}
                            disabled={actionLoading}
                            className="ringer-button bg-black text-white text-[10px] flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" /> REJECT APPLICANT
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Reject Application</h2>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              Provide feedback to the applicant
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (this will be sent to the applicant)..."
              className="w-full h-36 p-4 text-xs bg-zinc-50 border border-black/10 rounded-2xl mb-6 font-medium focus:outline-none focus:border-black/30 resize-none text-black"
            />
            <div className="flex gap-4">
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason}
                className="flex-1 bg-black text-white uppercase text-xs font-black h-12 rounded-xl"
              >
                Confirm Reject
              </Button>
              <Button
                onClick={() => setRejectModal({ isOpen: false, id: null })}
                disabled={actionLoading}
                variant="outline"
                className="flex-1 uppercase text-xs font-black h-12 rounded-xl border border-black/10 hover:bg-black/5 text-black bg-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrganizersPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">
        Loading registry database...
      </div>
    }>
      <AdminOrganizersPageContent />
    </Suspense>
  );
}
