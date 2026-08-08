"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PendingOrganizersPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/admin/organizers/pending`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setRequests(d.data);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const r = await fetch(`${baseUrl}/api/admin/organizers/${id}/approve`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        toast.success("Organizer Approved.");
        loadRequests();
      } else {
        toast.error("Failed to approve organizer.");
      }
    } catch (err) {
      toast.error("Failed to approve organizer.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.id || !rejectionReason) return;
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const r = await fetch(`${baseUrl}/api/admin/organizers/${rejectModal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Organizer Rejected.");
        setRejectModal({ isOpen: false, id: null });
        setRejectionReason("");
        loadRequests();
      } else {
        toast.error("Failed to reject organizer.");
      }
    } catch (err) {
      toast.error("Failed to reject organizer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-black/5 pb-12">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
            Pending Organizers
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            Verify & Approve applicant organizer credentials
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {requests.map((req) => (
          <Card key={req.id} className="ringer-card flex flex-col justify-between p-6 bg-white border border-black/5">
            <div>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-black/5">
                <span className="font-black italic uppercase tracking-tighter text-2xl truncate pr-2 text-black">
                  {req.brand_name || req.email}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full shrink-0">
                  Pending
                </span>
              </div>
              <div className="text-sm font-semibold text-zinc-600 mb-6 leading-relaxed">
                {req.description}
              </div>
              <div className="text-[11px] space-y-2 mb-8 text-zinc-400 font-bold bg-zinc-50/50 p-4 rounded-2xl border border-black/5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-zinc-400/80 uppercase tracking-wider">Email</span>
                  <span className="text-zinc-800 break-all select-all ml-2">{req.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-zinc-400/80 uppercase tracking-wider">Phone</span>
                  <span className="text-zinc-800 select-all ml-2">{req.phone_number}</span>
                </div>
                {req.social_links?.instagram && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-zinc-400/80 uppercase tracking-wider">Instagram</span>
                    <a href={req.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate ml-2 max-w-[200px]">
                      {req.social_links.instagram}
                    </a>
                  </div>
                )}
                {req.social_links?.facebook && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-zinc-400/80 uppercase tracking-wider">Facebook</span>
                    <a href={req.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate ml-2 max-w-[200px]">
                      {req.social_links.facebook}
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => handleApprove(req.id)}
                disabled={loading}
                className="flex-1 bg-primary text-black text-[10px] uppercase font-black hover:bg-primary/80 h-11 rounded-xl flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button
                onClick={() => setRejectModal({ isOpen: true, id: req.id })}
                disabled={loading}
                className="flex-1 bg-black text-white text-[10px] uppercase font-black hover:bg-zinc-800 h-11 rounded-xl flex items-center justify-center gap-1.5"
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="ringer-card bg-white p-16 text-center border border-black/5 flex flex-col items-center justify-center max-w-xl mx-auto rounded-[32px]">
          <div className="h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
            <Users className="h-8 w-8 text-zinc-300" />
          </div>
          <h3 className="text-black font-black uppercase italic tracking-tighter text-xl mb-2">No Applications</h3>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
            All organizer applications have been processed.
          </p>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Reject Application</h2>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Provide feedback to the applicant</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (this will be sent to the applicant)..."
              className="w-full h-36 p-4 text-xs bg-zinc-50 border border-black/10 rounded-2xl mb-6 font-medium focus:outline-none focus:border-black/30 resize-none text-black"
            />
            <div className="flex gap-4">
              <Button
                onClick={handleReject}
                disabled={loading || !rejectionReason}
                className="flex-1 bg-black text-white uppercase text-xs font-black h-12 rounded-xl"
              >
                Confirm Reject
              </Button>
              <Button
                onClick={() => setRejectModal({ isOpen: false, id: null })}
                disabled={loading}
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
