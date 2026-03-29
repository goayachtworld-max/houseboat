import { API_BASE } from "@/lib/api-config";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useGetSettings } from "@workspace/api-client-react";
import { useInquiryModal } from "@/context/InquiryModalContext";
import { Button } from "@/components/ui/button";
import { Clock, Users, CheckCircle2, PlusCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";



interface EventChargeable {
  name: string;
  price: number;
}

interface BoatEvent {
  id: number;
  name: string;
  description: string;
  image: string | null;
  amenities: string;
  chargeables: EventChargeable[];
  minHours: number;
  isActive: boolean;
  sortOrder: number;
}

const EVENT_IMAGES: Record<string, string> = {
  default: `${import.meta.env.BASE_URL}images/dining.png`,
};

function buildWhatsAppUrl(whatsappNumber: string, eventName: string): string {
  const cleaned = whatsappNumber.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Hi, I am looking for ${eventName} on [Date] with approx [X] people. Please share details and availability.`
  );
  return `https://wa.me/${cleaned}?text=${message}`;
}

export default function Events() {
  const { data: settings } = useGetSettings();
  const { open: openInquiry } = useInquiryModal();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: allEvents = [], isLoading } = useQuery<BoatEvent[]>({
    queryKey: ["events-public"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/events`, { credentials: "include" });
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeEvents = allEvents
    .filter(e => e.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const whatsappNumber = (settings as any)?.whatsappNumber || "";

  const EVENT_TYPES = [
    { label: "Birthday Party", emoji: "🎂" },
    { label: "Anniversary", emoji: "💍" },
    { label: "Bachelorette", emoji: "🥂" },
    { label: "Engagement Ceremony", emoji: "💑" },
    { label: "Special Shoot", emoji: "📸" },
    { label: "Family Get Together", emoji: "👨‍👩‍👧‍👦" },
  ];

  return (
    <div className="pt-24 pb-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">

        {/* Hero header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-secondary font-semibold text-sm uppercase tracking-widest mb-3">Host With Us</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-6">Events on the Water</h1>
          <p className="text-lg text-muted-foreground">
            Celebrate life's most precious moments aboard Shubhangi The Boat House. From intimate anniversaries to grand family gatherings — we make every occasion unforgettable.
          </p>
        </div>

        {/* Event type chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {EVENT_TYPES.map(t => (
            <span key={t.label} className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-sm font-medium text-primary">
              <span>{t.emoji}</span>
              {t.label}
            </span>
          ))}
        </div>

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl mb-20"
        >
          <img
            src={`${import.meta.env.BASE_URL}images/dining.png`}
            alt="Events on the Houseboat"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-3">Your Celebration, Our Stage</h2>
            <p className="text-white/85 text-lg max-w-2xl">Gliding through Goa's backwaters with the people you love.</p>
          </div>
        </motion.div>

        {/* Event cards — dynamic from admin */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && activeEvents.length > 0 && (
          <div className="space-y-8 mb-20">
            {activeEvents.map((event, idx) => {
              const amenityList = event.amenities
                ? event.amenities.split(/\n|,/).map(a => a.trim()).filter(Boolean)
                : [];
              const isOpen = expanded === event.id;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07 }}
                  className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
                    {/* Image */}
                    {event.image && (
                      <div className="md:col-span-2 aspect-video md:aspect-auto relative bg-muted">
                        <img
                          src={event.image}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className={cn("p-6 md:p-8 flex flex-col gap-4", event.image ? "md:col-span-3" : "md:col-span-5")}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="text-2xl font-display font-bold text-primary mb-1">{event.name}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Minimum {event.minHours} hour{event.minHours !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                      )}

                      {/* Amenities */}
                      {amenityList.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Included Amenities
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {amenityList.map((a, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full font-medium">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chargeables toggle */}
                      {event.chargeables && event.chargeables.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpanded(isOpen ? null : event.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:text-secondary transition-colors"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            {isOpen ? "Hide" : "View"} Extra Add-ons ({event.chargeables.length})
                          </button>

                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 space-y-2"
                            >
                              {event.chargeables.map((c, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg text-sm">
                                  <span className="text-foreground font-medium">{c.name}</span>
                                  <span className="text-primary font-semibold">₹{c.price.toLocaleString()}</span>
                                </div>
                              ))}
                              <p className="text-[11px] text-muted-foreground mt-1">* Add-ons are optional and charged separately</p>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* CTA buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2 mt-auto">
                        <Button
                          variant="default"
                          className="w-full sm:flex-1 gap-2"
                          onClick={() => openInquiry({ packageService: event.name })}
                        >
                          <Users className="w-4 h-4" />
                          Send Inquiry
                        </Button>
                        {whatsappNumber && (
                          <a
                            href={buildWhatsAppUrl(whatsappNumber, event.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:flex-1"
                          >
                            <Button variant="outline" className="w-full gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white">
                              <MessageCircle className="w-4 h-4" />
                              Enquire on WhatsApp
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Fallback when no events configured yet */}
        {!isLoading && activeEvents.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">Events coming soon — please reach out to us directly to discuss your event.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Button onClick={() => openInquiry()} className="w-full sm:w-auto gap-2">
                <Users className="w-4 h-4" /> Send Inquiry
              </Button>
              {whatsappNumber && (
                <a href={buildWhatsAppUrl(whatsappNumber, "an event")} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white">
                    <MessageCircle className="w-4 h-4" /> WhatsApp Us
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 text-center bg-primary text-primary-foreground p-12 rounded-3xl">
          <h2 className="text-3xl font-display font-bold mb-4">Have a Custom Event in Mind?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Don't see exactly what you're looking for? We tailor every event to your vision. 
            Get in touch and we'll craft a bespoke experience just for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="rounded-full px-10 gap-2" onClick={() => openInquiry({ packageService: "Custom Event" })}>
              <Users className="w-4 h-4" /> Send an Inquiry
            </Button>
            {whatsappNumber && (
              <a href={buildWhatsAppUrl(whatsappNumber, "a custom event")} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="rounded-full px-10 gap-2 border-white/40 text-white hover:bg-white hover:text-primary">
                  <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
