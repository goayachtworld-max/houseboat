import { API_BASE } from "@/lib/api-config";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetSettings, useListPackages, useListActivities } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Anchor, Wind, Sun, Coffee, ChevronDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { AvailabilitySearch } from "@/components/AvailabilitySearch";
import { useCurrency } from "@/context/CurrencyContext";
import { useInquiryModal } from "@/context/InquiryModalContext";
import { useState, useEffect } from "react";



interface Faq { id: number; question: string; answer: string; isActive: boolean; sortOrder: number; }

const FALLBACK_FEATURES = [
  { icon: Anchor, title: "Premium Stay", desc: "3 Luxurious Bedrooms" },
  { icon: Wind, title: "Water Sports", desc: "Kayaking & Speed Boating" },
  { icon: Sun, title: "Scenic Views", desc: "Golden Hour Sunsets" },
  { icon: Coffee, title: "Gourmet Dining", desc: "Live Rooftop Restaurant" },
];

export default function Home() {
  const { data: settings } = useGetSettings();
  const { data: packages = [] } = useListPackages();
  const { data: activities = [] } = useListActivities();
  const { fmt } = useCurrency();
  const { open: openInquiry } = useInquiryModal();
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  const { data: allFaqs = [] } = useQuery<Faq[]>({
    queryKey: ["faqs-public"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/faqs`, { credentials: "include" });
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const activeFaqs = allFaqs.filter(f => f.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const activeActivities = activities
    .filter((a) => a.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);

  const heroImage = settings?.heroImage || `${import.meta.env.BASE_URL}images/hero.png`;

  useEffect(() => {
    if (window.location.hash === "#check-availability") {
      setTimeout(() => {
        const el = document.getElementById("check-availability");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const firstInput = el.querySelector("input, select, button");
          if (firstInput) (firstInput as HTMLElement).focus();
        }
      }, 400);
    }
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section — widget lives inside at 45% */}
      <section className="relative h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Goa Houseboat Hero"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />
        </div>

        {/* Hero text — tight block in the upper 38% */}
        <div className="absolute top-[7%] left-0 right-0 z-10 text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-3 leading-tight drop-shadow-lg"
          >
            {settings?.heroTitle || "Escape to Luxury"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base md:text-lg text-white/85 mb-5 font-light drop-shadow-md max-w-xl mx-auto"
          >
            {settings?.heroSubtitle || "Experience the serene backwaters of Goa in our premium 3-bedroom wooden houseboat."}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/packages">
              <Button size="default" className="w-full sm:w-auto px-7 py-2.5 rounded-full">
                View Packages
              </Button>
            </Link>
            <Button
              size="default"
              variant="outline"
              className="w-full sm:w-auto px-7 py-2.5 rounded-full text-white border-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Discover More
            </Button>
          </motion.div>
        </div>

        {/* Availability Search — pinned to bottom on all screen sizes */}
        <div id="check-availability" className="absolute bottom-6 md:bottom-10 left-0 right-0 z-20 px-4">
          <AvailabilitySearch />
        </div>
      </section>

      {/* Features Banner — driven by admin Activities, falls back to static if none set */}
      <section className="bg-white py-12 border-b border-muted">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {activeActivities.length > 0
            ? activeActivities.map((activity, idx) => {
                const Icon = (LucideIcons as any)[activity.icon] || Anchor;
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col items-center text-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-foreground">{activity.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                    </div>
                  </motion.div>
                );
              })
            : FALLBACK_FEATURES.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col items-center text-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
        </div>
      </section>

      {/* About Preview */}
      <section id="about" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-sm font-bold tracking-widest text-secondary uppercase mb-3">Welcome Aboard</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-primary mb-6 leading-tight">
              A Floating Paradise in the Heart of Goa
            </h3>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {settings?.aboutText ? settings.aboutText.substring(0, 250) + "..." : "Immerse yourself in the tranquility of Goa's backwaters. Our premium wooden houseboat offers an unparalleled blend of traditional charm and modern luxury. With three exquisitely designed bedrooms, a rooftop restaurant, and thrilling water activities, your perfect getaway awaits."}
            </p>
            <Link href="/about">
              <Button variant="outline" className="rounded-full px-8">Read Our Story</Button>
            </Link>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={`${import.meta.env.BASE_URL}images/about.png`} 
                alt="Houseboat exterior" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-xl shadow-xl max-w-xs hidden md:block">
              <p className="font-display text-xl font-bold text-primary">"An unforgettable magical experience."</p>
              <div className="flex items-center gap-2 mt-2 text-secondary">
                {"★★★★★".split("").map((star, i) => <span key={i}>{star}</span>)}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Packages */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-widest text-secondary uppercase mb-3">Our Offerings</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-primary">Choose Your Experience</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packages.filter(p => p.isActive).slice(0, 3).map((pkg, idx) => (
              <motion.div 
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="bg-card rounded-2xl overflow-hidden shadow-lg border border-border group hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img 
                    src={pkg.images?.[0] || `${import.meta.env.BASE_URL}images/bedroom.png`} 
                    alt={pkg.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-primary font-bold text-sm shadow-sm">
                    Up to {pkg.capacity} Guests
                  </div>
                </div>
                <div className="p-8">
                  <h4 className="text-2xl font-display font-bold text-primary mb-2">{pkg.name}</h4>
                  <p className="text-muted-foreground text-sm mb-6 line-clamp-2">{pkg.description}</p>
                  <div className="flex items-end justify-between mt-auto pt-6 border-t border-muted">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">From</p>
                      <p className="text-2xl font-bold text-secondary">{fmt(pkg.pricePerNight)}<span className="text-sm text-muted-foreground font-normal">/night</span></p>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => openInquiry({ packageService: pkg.name })}
                    >
                      Inquire
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/packages">
              <Button size="lg" className="rounded-full px-10">View All Packages</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {activeFaqs.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14 max-w-3xl mx-auto"
            >
              <p className="text-secondary font-semibold text-sm uppercase tracking-widest mb-3">Got Questions?</p>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary leading-tight">
                Frequently Asked Questions About the<br className="hidden sm:block" /> Goan Houseboat Trip
              </h2>
            </motion.div>

            <div className="divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
              {activeFaqs.map((faq, idx) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06, duration: 0.4 }}
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-foreground leading-snug pr-2">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-0">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{faq.answer}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
