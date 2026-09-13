"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Users, 
  Sparkles, 
  Key, 
  RefreshCw, 
  Camera, 
  ShieldCheck, 
  Volume2, 
  VolumeX,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Web Audio API feedback sounds
function playAudioFeedback(type: 'success' | 'error') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

function triggerHaptic(type: 'success' | 'error') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (type === 'success') {
      navigator.vibrate([80, 40, 80]);
    } else {
      navigator.vibrate([200, 100, 200]);
    }
  }
}

export default function GateScannerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = params?.eventId as string;
  const initialPin = searchParams.get('pin') || '';

  // Auth & PIN State
  const [pinCode, setPinCode] = useState(initialPin);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(!!initialPin);
  const [tempPinInput, setTempPinInput] = useState('');

  // Scanner State
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    attendee?: any;
    code?: string;
  }>({ status: 'idle', message: '' });

  // Attendance Stats
  const [stats, setStats] = useState<{
    total_rsvps: number;
    checked_in_count: number;
    unclaimed_count: number;
    percentage: number;
    recent_checkins: any[];
  } | null>(null);

  // Manual Search Drawer State
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScanRef = useRef(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // 1. Fetch Attendance Stats
  const fetchStats = async () => {
    if (!eventId) return;
    try {
      const pinParam = pinCode ? `?staff_pin=${pinCode}` : '';
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/attendance${pinParam}`);
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        setIsPinAuthenticated(true);
      }
    } catch (e) {
      console.error("Failed to load attendance stats:", e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [eventId, pinCode]);

  // 2. Initialize Camera Scanner
  useEffect(() => {
    if (!isPinAuthenticated || !eventId) return;

    let html5QrCode: Html5Qrcode;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("qr-reader", {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0
          },
          onScanSuccess,
          () => {} // Silent on scan failure frame
        );
        setScannerActive(true);
      } catch (err) {
        console.error("Camera start error:", err);
        toast.error("Could not start camera. Please ensure camera permissions are granted.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isPinAuthenticated, eventId]);

  // 3. Process Scanned QR Code
  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    try {
      let qrToken = decodedText.trim();
      // If full deep-link url scanned, extract token
      if (qrToken.includes('start=pass_')) {
        qrToken = qrToken.split('start=pass_')[1]?.split('&')[0];
      }

      const res = await fetch(`${baseUrl}/api/passes/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: qrToken,
          event_id: eventId,
          staff_pin: pinCode
        })
      });

      const data = await res.json();

      if (data.success) {
        playAudioFeedback('success');
        triggerHaptic('success');
        setScanResult({
          status: 'success',
          message: data.message || 'Pass verified successfully!',
          attendee: data.attendee
        });
        fetchStats();
      } else {
        playAudioFeedback('error');
        triggerHaptic('error');
        setScanResult({
          status: 'error',
          message: data.message || 'Invalid or duplicate pass.',
          code: data.code,
          attendee: data.pass
        });
      }
    } catch (e) {
      playAudioFeedback('error');
      setScanResult({
        status: 'error',
        message: 'Network error verifying pass. Try again.'
      });
    }

    // Auto clear alert after 3 seconds to resume scanning
    setTimeout(() => {
      setScanResult({ status: 'idle', message: '' });
      isProcessingScanRef.current = false;
    }, 3200);
  };

  // 4. Manual Attendee Search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const pinParam = pinCode ? `&staff_pin=${pinCode}` : '';
      const res = await fetch(`${baseUrl}/api/passes/attendees?event_id=${eventId}&q=${encodeURIComponent(query)}${pinParam}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.attendees || []);
      }
    } catch (e) {
      toast.error("Failed searching attendees");
    } finally {
      setSearching(false);
    }
  };

  const handleManualCheckIn = async (rsvpId: number) => {
    try {
      const res = await fetch(`${baseUrl}/api/passes/manual-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvp_id: rsvpId,
          event_id: eventId,
          staff_pin: pinCode
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        playAudioFeedback('success');
        triggerHaptic('success');
        fetchStats();
        handleSearch(searchQuery);
      } else {
        toast.error(data.message);
        playAudioFeedback('error');
      }
    } catch (e) {
      toast.error("Manual check-in failed");
    }
  };

  // PIN Login Gatekeeper Screen
  if (!isPinAuthenticated) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto text-primary">
            <Key className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase">Gate Scanner Access</h1>
            <p className="text-xs text-zinc-400">Enter the 4-digit Gate Scanner PIN provided by the event organizer.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (tempPinInput.trim().length >= 4) {
              setPinCode(tempPinInput.trim());
              setIsPinAuthenticated(true);
            } else {
              toast.error("Please enter a valid 4-digit PIN");
            }
          }} className="space-y-4">
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={tempPinInput}
              onChange={(e) => setTempPinInput(e.target.value)}
              placeholder="0000"
              className="w-full text-center text-3xl font-mono tracking-widest py-3 px-4 bg-zinc-800 border border-zinc-700 rounded-2xl text-white focus:outline-none focus:border-primary"
              autoFocus
            />

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-wider py-4 rounded-2xl active:scale-95 transition-all text-sm shadow-lg shadow-primary/20"
            >
              Unlock Gate Scanner
            </button>
          </form>

          <Link href="/dashboard" className="inline-block text-xs text-zinc-500 hover:text-zinc-300">
            ← Return to VibeCheck
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden select-none">
      {/* Header Bar */}
      <header className="z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-1 text-zinc-400 hover:text-white rounded-xl active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Gate Staff Active</span>
            </div>
            <h1 className="text-sm font-black truncate max-w-[180px] sm:max-w-xs text-zinc-200">
              Pass Scanner
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-200 active:scale-95"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span>Search</span>
          </button>
          <button
            onClick={fetchStats}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 active:scale-90"
            title="Refresh Attendance Count"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Attendance Stats Strip */}
      {stats && (
        <section className="z-10 bg-zinc-900/60 border-b border-zinc-800/50 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-zinc-400 font-sans">Checked In:</span>
            <span className="text-base font-black text-white">{stats.checked_in_count}</span>
            <span className="text-zinc-500">/ {stats.total_rsvps}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <span className="font-bold text-primary font-mono">{stats.percentage}%</span>
          </div>
        </section>
      )}

      {/* Viewfinder Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-sm aspect-square bg-zinc-950 rounded-3xl overflow-hidden relative border border-zinc-800 shadow-2xl">
          <div id="qr-reader" className="w-full h-full object-cover" />

          {/* Viewfinder Overlay Guide */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-64 h-64 border-2 border-dashed border-primary/60 rounded-3xl relative animate-pulse">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mt-4 text-center">
          Point camera at attendee's Telegram or Web pass QR code
        </p>
      </div>

      {/* Full Screen Scan Alert Overlay */}
      {scanResult.status !== 'idle' && (
        <div 
          onClick={() => {
            setScanResult({ status: 'idle', message: '' });
            isProcessingScanRef.current = false;
          }}
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200 cursor-pointer ${
            scanResult.status === 'success' 
              ? 'bg-emerald-950/95 border-4 border-emerald-500' 
              : 'bg-rose-950/95 border-4 border-rose-500'
          }`}
        >
          {scanResult.status === 'success' ? (
            <div className="space-y-4 max-w-xs animate-bounce">
              <CheckCircle2 className="w-24 h-24 text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/40">
                  ENTRY APPROVED
                </span>
                <h2 className="text-3xl font-black text-white mt-2">
                  {scanResult.attendee?.name || 'VIP Attendee'}
                </h2>
                <p className="text-xs text-emerald-200 font-mono">
                  Pass: {scanResult.attendee?.pass_code || 'VB-VERIFIED'}
                </p>
              </div>
              <p className="text-xs text-emerald-300">Tap anywhere to scan next</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-xs">
              <XCircle className="w-24 h-24 text-rose-400 mx-auto" />
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-widest text-rose-400 bg-rose-900/60 px-3 py-1 rounded-full border border-rose-500/40">
                  {scanResult.code === 'ALREADY_CHECKED_IN' ? 'ALREADY SCANNED' : 'ENTRY REJECTED'}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">
                  {scanResult.message}
                </h2>
              </div>
              <p className="text-xs text-rose-300">Tap anywhere to resume scanning</p>
            </div>
          )}
        </div>
      )}

      {/* Manual Search Modal / Drawer */}
      {showManualSearch && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full mx-auto max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span>Manual Attendee Lookup</span>
              </h3>
              <button 
                onClick={() => setShowManualSearch(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name, email, or pass code..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {searching ? (
                <div className="text-center py-8 text-zinc-500 text-xs">Searching database...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((att) => (
                  <div 
                    key={att.id}
                    className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">{att.attendee_name || 'Attendee'}</h4>
                      <p className="text-xs text-zinc-400 font-mono">{att.user_email || att.phone_number}</p>
                      <span className="text-[10px] font-mono text-zinc-500">Code: {att.pass_code}</span>
                    </div>

                    <div>
                      {att.checkin_status === 'checked_in' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1.5 rounded-xl">
                          Checked In
                        </span>
                      ) : (
                        <button
                          onClick={() => handleManualCheckIn(att.id)}
                          className="text-xs font-bold bg-primary hover:bg-primary/90 text-black px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/20"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="text-center py-8 text-zinc-500 text-xs">No matching attendees found for this event.</div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">Type a name or email to search.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
