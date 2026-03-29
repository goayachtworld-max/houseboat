import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListPackages } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Search, CalendarDays, Users, Baby, ChevronDown,
  CheckCircle, AlertCircle, XCircle, Loader2, MessageSquareText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInquiryModal } from "@/hooks/use-inquiry-modal";

import { API_BASE as API } from "@/lib/api-config";

interface AvailabilityResult {
  date: string;
  available: boolean;
  bookingCount: number;
  totalGuests: number;
  maxGuests: number;
  status: "available" | "limited" | "full";
}

function Counter({ value, onChange, min = 0, max = 20 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-base font-bold text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >−</button>
      <span className="w-7 text-center font-bold text-white text-base">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-base font-bold text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >+</button>
    </div>
  );
}

const statusConfig = {
  available: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-900/40 border-green-400/30",
    label: "Available!",
    desc: "Great news — this date is open for bookings.",
  },
  limited: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-900/40 border-amber-400/30",
    label: "Limited Availability",
    desc: "Some slots are taken for this date. Contact us to confirm your spot.",
  },
  full: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-900/40 border-red-400/30",
    label: "Fully Booked",
    desc: "This date is fully booked. Try another date or contact us for alternatives.",
  },
};

export function AvailabilitySearch() {
  const { data: packages = [] } = useListPackages();
  const { open: openInquiry } = useInquiryModal();

  const [packageService, setPackageService] = useState("");
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const handleSearch = async () => {
    if (!date) { setError("Please select a date."); return; }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/bookings/availability?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data: AvailabilityResult = await res.json();
      setResult(data);
    } catch {
      setError("Could not check availability. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: focused ? 1 : 0.72, y: 0 }}
      whileHover={!focused ? { opacity: 0.9 } : undefined}
      transition={{ duration: 0.55, delay: focused ? 0 : 0.6 }}
      onClick={() => setFocused(true)}
      className="w-full max-w-4xl mx-auto cursor-default"
    >
      <div className={cn(
        "rounded-2xl overflow-hidden border transition-all duration-500",
        focused
          ? "bg-primary/90 backdrop-blur-xl border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          : "bg-primary/65 backdrop-blur-md border-white/15 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      )}>
        {/* Title row */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
          <Search className="w-3.5 h-3.5 text-white/60" />
          <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Check Availability</span>
        </div>

        {/* Fields */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">

            {/* Package / Service */}
            <div className="col-span-2 md:col-span-1 space-y-1.5">
              <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wide flex items-center gap-1 whitespace-nowrap">
                Package / Service
              </label>
              <div className="relative">
                <select
                  value={packageService}
                  onChange={e => setPackageService(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="w-full h-10 rounded-xl border border-white/20 bg-white/10 pl-3 pr-7 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 appearance-none placeholder:text-white/40 [&>option]:bg-primary [&>option]:text-white"
                >
                  <option value="">Any Package</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
              </div>
            </div>

            {/* Date */}
            <div className="col-span-2 md:col-span-1 space-y-1.5">
              <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wide flex items-center gap-1 whitespace-nowrap">
                <CalendarDays className="w-3 h-3" /> Check-in Date
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onClick={e => e.stopPropagation()}
                onChange={e => { setDate(e.target.value); setResult(null); setError(""); }}
                className="w-full h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 [color-scheme:dark]"
              />
            </div>

            {/* Adults */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wide flex items-center gap-1 whitespace-nowrap">
                <Users className="w-3 h-3" /> Adults
              </label>
              <div className="h-10 flex items-center px-2 rounded-xl border border-white/20 bg-white/10">
                <Counter value={adults} onChange={setAdults} min={1} />
              </div>
            </div>

            {/* Kids */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wide flex items-center gap-1 whitespace-nowrap">
                <Baby className="w-3 h-3" /> Kids
              </label>
              <div className="h-10 flex items-center px-2 rounded-xl border border-white/20 bg-white/10">
                <Counter value={kids} onChange={setKids} min={0} />
              </div>
            </div>

            {/* Button */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-transparent uppercase tracking-wide">·</label>
              <button
                onClick={e => { e.stopPropagation(); handleSearch(); }}
                disabled={loading}
                className="w-full h-10 rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
                  : <><Search className="w-4 h-4" /> Check</>
                }
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-2.5 text-xs text-red-300 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {(() => {
                const cfg = statusConfig[result.status];
                const Icon = cfg.icon;
                return (
                  <div className={cn(
                    "mx-4 mb-4 rounded-xl border p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3",
                    cfg.bg
                  )}>
                    <div className="flex items-center gap-2.5 flex-1">
                      <Icon className={cn("w-5 h-5 shrink-0", cfg.color)} />
                      <div>
                        <p className={cn("font-bold text-sm", cfg.color)}>{cfg.label}</p>
                        <p className="text-xs text-white/60 mt-0.5">{cfg.desc}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {new Date(result.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          {packageService && <> · {packageService}</>}
                          {" · "}{adults} adult{adults !== 1 ? "s" : ""}{kids > 0 ? `, ${kids} kid${kids !== 1 ? "s" : ""}` : ""}
                        </p>
                      </div>
                    </div>
                    {result.status !== "full" ? (
                      <Button
                        size="sm"
                        className="shrink-0 gap-1.5 rounded-lg text-xs"
                        onClick={e => { e.stopPropagation(); openInquiry({ packageService, checkIn: date, adults: String(adults), kids: String(kids) }); }}
                      >
                        <MessageSquareText className="w-3.5 h-3.5" />
                        Inquire Now
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 rounded-lg text-xs border-white/30 text-white hover:bg-white/10"
                        onClick={e => { e.stopPropagation(); openInquiry({ packageService, adults: String(adults), kids: String(kids) }); }}
                      >
                        <MessageSquareText className="w-3.5 h-3.5" />
                        Ask Alternatives
                      </Button>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
