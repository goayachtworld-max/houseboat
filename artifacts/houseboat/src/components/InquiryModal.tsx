import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle, User, Phone, Mail, MessageSquare, Calendar, Users } from "lucide-react";
import type { InquiryPrefill } from "@/context/InquiryModalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";


import { API_BASE as API } from "@/lib/api-config";

const PACKAGES = [
  "Day Cruise (6 hrs)",
  "Overnight Stay",
  "Weekend Package (2 Nights)",
  "3-Night Luxury Package",
  "Honeymoon Special",
  "Corporate / Group Charter",
  "Custom / Other",
];

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: InquiryPrefill;
}

interface FormData {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  packageService: string;
  checkIn: string;
  adults: string;
  kids: string;
  paxDetails: string;
  message: string;
}

const EMPTY: FormData = {
  name: "", phone: "", whatsapp: "", email: "",
  packageService: "", checkIn: "", adults: "2", kids: "0",
  paxDetails: "", message: "",
};

export function InquiryModal({ open, onClose, initialData }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Lock scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Pre-fill form when initialData changes (e.g. from availability search)
  useEffect(() => {
    if (open && initialData) {
      setForm(prev => ({
        ...prev,
        ...(initialData.packageService !== undefined ? { packageService: initialData.packageService! } : {}),
        ...(initialData.checkIn !== undefined ? { checkIn: initialData.checkIn! } : {}),
        ...(initialData.adults !== undefined ? { adults: initialData.adults! } : {}),
        ...(initialData.kids !== undefined ? { kids: initialData.kids! } : {}),
      }));
    } else if (!open) {
      // Reset form on close
      setForm(EMPTY);
      setErrors({});
      setSuccess(false);
    }
  }, [open, initialData]);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/inquiry`, { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: parseInt(form.adults) || 2, kids: parseInt(form.kids) || 0 }),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess(true);
      setForm(EMPTY);
      setTimeout(() => { setSuccess(false); onClose(); }, 2800);
    } catch {
      setErrors({ message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header — always pinned, never scrolls */}
            <div className="shrink-0 bg-primary text-primary-foreground px-6 py-5 flex items-start justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold font-display">Send an Inquiry</h2>
                <p className="text-primary-foreground/70 text-sm mt-0.5">
                  Fill in your details and we'll get back to you within 2 hours.
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
            {success ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 px-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold">Inquiry Sent!</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Thank you! We've received your inquiry and will reach out to you shortly via WhatsApp or email.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Personal Details */}
                <div className="space-y-4">
                  <SectionLabel icon={User} label="Personal Details" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Full Name *" error={errors.name}>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={form.name} onChange={set("name")} placeholder="e.g. John Smith" className={cn("pl-9", errors.name && "border-destructive")} />
                      </div>
                    </FormField>
                    <FormField label="Email Address *" error={errors.email}>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={cn("pl-9", errors.email && "border-destructive")} />
                      </div>
                    </FormField>
                    <FormField label="Phone Number *" error={errors.phone}>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" className={cn("pl-9", errors.phone && "border-destructive")} />
                      </div>
                    </FormField>
                    <FormField label="WhatsApp Number">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <Input value={form.whatsapp} onChange={set("whatsapp")} placeholder="Same as phone? Leave blank" className="pl-9" />
                      </div>
                    </FormField>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Booking Details */}
                <div className="space-y-4">
                  <SectionLabel icon={Calendar} label="Booking Details" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Package / Service / Event" className="sm:col-span-2">
                      <div className="relative">
                        <Input
                          list="package-suggestions"
                          value={form.packageService}
                          onChange={set("packageService")}
                          placeholder="e.g. Birthday Party, Overnight Stay…"
                        />
                        <datalist id="package-suggestions">
                          {PACKAGES.map(p => <option key={p} value={p} />)}
                        </datalist>
                      </div>
                    </FormField>
                    <FormField label="Preferred Date">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="date" value={form.checkIn} onChange={set("checkIn")} className="pl-9" min={new Date().toISOString().split("T")[0]} />
                      </div>
                    </FormField>
                    <FormField label="Adults">
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" min={1} max={50} value={form.adults} onChange={set("adults")} placeholder="2" className="pl-9" />
                      </div>
                    </FormField>
                    <FormField label="Kids (under 12)">
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" min={0} max={20} value={form.kids} onChange={set("kids")} placeholder="0" className="pl-9" />
                      </div>
                    </FormField>
                    <FormField label="Group Details / Special Notes" className="sm:col-span-2">
                      <Input
                        value={form.paxDetails}
                        onChange={set("paxDetails")}
                        placeholder="e.g. anniversary trip, dietary needs, ages of kids…"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Extra Notes */}
                <FormField label="Extra Notes / Special Requests" icon={MessageSquare}>
                  <Textarea
                    value={form.message}
                    onChange={set("message")}
                    placeholder="Any special requests, dietary requirements, accessibility needs, or questions for us…"
                    className="min-h-[100px] resize-none"
                  />
                  {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                </FormField>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                    {submitting ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Inquiry</>
                    )}
                  </Button>
                </div>
              </form>
            )}
            </div>{/* end scrollable body */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

function FormField({ label, children, error, className, icon: _Icon }: {
  label: string; children: React.ReactNode; error?: string; className?: string; icon?: React.ElementType;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
