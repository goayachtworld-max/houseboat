import { API_BASE } from "@/lib/api-config";
import { Link, useLocation } from "wouter";
import { useGetSettings } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Menu, X, Instagram, Facebook, Youtube, MessageCircle, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { InquiryModal } from "@/components/InquiryModal";
import { InquiryModalProvider, useInquiryModal } from "@/context/InquiryModalContext";
import { CurrencyProvider, useCurrency, type Currency } from "@/context/CurrencyContext";
import { ChatWidget } from "@/components/ChatWidget";
const FALLBACK_LOGO = "/images/logo_transparent.png";

const ALL_NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Packages", href: "/packages" },
  { name: "Events", href: "/events" },
  { name: "Activities", href: "/activities" },
  { name: "Gallery", href: "/gallery" },
  { name: "Blog", href: "/blog" },
  { name: "About", href: "/about" },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <InquiryModalProvider>
        <PublicLayoutInner>{children}</PublicLayoutInner>
      </InquiryModalProvider>
    </CurrencyProvider>
  );
}

function CurrencySwitcher({ scrolled, onHome }: { scrolled: boolean; onHome: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const currencies: Currency[] = ["INR", "GBP", "USD"];
  const isLight = scrolled || !onHome;
  return (
    <div className={cn(
      "flex items-center rounded-full p-0.5 gap-0.5",
      isLight ? "bg-muted" : "bg-white/15 backdrop-blur-sm"
    )}>
      {currencies.map(c => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all leading-none",
            currency === c
              ? isLight
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white text-primary shadow-sm"
              : isLight
                ? "text-muted-foreground hover:text-foreground"
                : "text-white/70 hover:text-white"
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}



interface Award {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
}

function PublicLayoutInner({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOpen: inquiryOpen, prefill: inquiryPrefill, open: openInquiry, close: closeInquiry } = useInquiryModal();
  const { data: settings } = useGetSettings();

  const { data: allAwards = [] } = useQuery<Award[]>({
    queryKey: ["awards-public"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/awards`, { credentials: "include" });
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const activeAwards = allAwards.filter(a => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const logo = (settings as any)?.siteLogo || FALLBACK_LOGO;
  const hiddenItems: string[] = (settings as any)?.navHiddenItems || [];
  const showChat = (settings as any)?.showChatWidget !== "false";
  const chatWidgetColor: string = (settings as any)?.chatWidgetColor || "#10b981";
  const chatWidgetAlignment: "left" | "right" = (settings as any)?.chatWidgetAlignment === "left" ? "left" : "right";
  const showWhatsapp = (settings as any)?.showWhatsappButton !== "false";
  const NAV_LINKS = ALL_NAV_LINKS.filter(l => !hiddenItems.includes(l.name));

  // Keep browser tab title in sync with site name
  useEffect(() => {
    if (settings?.siteName) {
      document.title = `${settings.siteName} | Luxury Houseboat Experience in Goa`;
    }
  }, [settings?.siteName]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const whatsappLink = settings?.whatsappNumber 
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=Hello!%20I%20would%20like%20to%20inquire%20about%20the%20houseboat.`
    : "#";

  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground">
      {/* Header */}
      <header
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
          isScrolled || location !== "/"
            ? "bg-background/95 backdrop-blur-md shadow-sm border-border py-3"
            : "bg-transparent py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <a
            href="/"
            onClick={e => { e.preventDefault(); navigate("/"); }}
            className="flex items-center gap-2.5 group shrink-0 cursor-pointer"
          >
            <img
              src={logo}
              alt="Shubhangi The Boat House"
              className="h-10 w-auto object-contain transition-all duration-300 drop-shadow-md"
            />
            <div className="flex flex-col leading-tight">
              <span className={cn(
                "font-display font-bold text-base transition-colors",
                isScrolled || location !== "/" ? "text-primary" : "text-white drop-shadow"
              )}>Shubhangi</span>
              <span className={cn(
                "font-display text-[11px] font-medium tracking-wide transition-colors",
                isScrolled || location !== "/" ? "text-muted-foreground" : "text-white/80 drop-shadow"
              )}>The Boat House</span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-secondary",
                  location === link.href 
                    ? "text-secondary" 
                    : (isScrolled || location !== "/" ? "text-foreground" : "text-white/90")
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <CurrencySwitcher scrolled={isScrolled} onHome={location === "/"} />
            <button
              onClick={() => openInquiry()}
              className={cn(
                "px-5 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105 shadow-sm flex items-center gap-2 border",
                isScrolled || location !== "/"
                  ? "bg-background border-border text-foreground hover:bg-muted"
                  : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              Inquire
            </button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-full bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/90 transition-all hover:scale-105 shadow-md flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Book Now
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu className={cn(isScrolled || location !== "/" ? "text-foreground" : "text-white")} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-background pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-xl font-display">
              {/* Currency switcher */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-sans font-medium">Currency:</span>
                <CurrencySwitcher scrolled={true} onHome={false} />
              </div>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "border-b border-border pb-4",
                    location === link.href ? "text-secondary" : "text-foreground"
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); openInquiry(); }}
                className="px-6 py-4 rounded-xl border border-border text-foreground font-bold text-center flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Send an Inquiry
              </button>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 rounded-xl bg-secondary text-secondary-foreground font-bold text-center flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Book via WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-16 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand column */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3 mb-6">
              <img
                src={logo}
                alt="Shubhangi The Boat House"
                className="h-14 w-auto object-contain drop-shadow-lg"
              />
              <div>
                <p className="font-display font-bold text-xl text-white leading-tight">Shubhangi</p>
                <p className="font-display text-sm text-secondary font-semibold tracking-wider">The Boat House</p>
              </div>
            </div>
            <p className="text-primary-foreground/70 mb-6">
              {settings?.tagline || "Experience the ultimate luxury on the beautiful waters of Goa."}
            </p>
            <div className="flex gap-4 justify-center md:justify-start">
              {settings?.socialInstagram && (
                <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings?.socialFacebook && (
                <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings?.socialYoutube && (
                <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links column */}
          <div className="text-center md:text-left">
            <h4 className="text-lg font-display font-semibold mb-6 text-secondary">Quick Links</h4>
            <ul className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2 md:flex-col md:gap-0 md:space-y-3">
              {NAV_LINKS.slice(0, 5).map(link => (
                <li key={link.name}>
                  <Link href={link.href} className="text-primary-foreground/80 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div className="text-center md:text-left">
            <h4 className="text-lg font-display font-semibold mb-6 text-secondary">Contact Us</h4>
            <div className="space-y-4 text-primary-foreground/80">
              <p>Email: {settings?.inquiryEmail || "bookings@goahouseboat.com"}</p>
              <p>Phone: {settings?.whatsappNumber || "+91 98765 43210"}</p>
              <Link href="/admin/login" className="inline-block mt-8 text-sm opacity-50 hover:opacity-100 transition-opacity">
                Admin Login
              </Link>
            </div>
          </div>
        </div>
        {/* Awards Recognition Strip */}
        {activeAwards.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-primary-foreground/10">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2 text-primary-foreground/60">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">Awards & Recognition</span>
                <Trophy className="w-4 h-4" />
              </div>
              <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                {activeAwards.map(award => (
                  <div key={award.id} className="flex flex-col items-center gap-2 group">
                    {award.link ? (
                      <a href={award.link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2">
                        {award.image ? (
                          <img
                            src={award.image}
                            alt={award.title}
                            className="h-14 w-auto max-w-[100px] object-contain opacity-80 group-hover:opacity-100 transition-opacity filter brightness-0 invert"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center group-hover:bg-primary-foreground/20 transition-colors">
                            <Trophy className="w-6 h-6 text-secondary" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-xs font-semibold text-primary-foreground/80 group-hover:text-white transition-colors leading-tight max-w-[110px]">{award.title}</p>
                          {award.subtitle && <p className="text-[10px] text-primary-foreground/50 mt-0.5 leading-tight max-w-[110px]">{award.subtitle}</p>}
                        </div>
                      </a>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {award.image ? (
                          <img
                            src={award.image}
                            alt={award.title}
                            className="h-14 w-auto max-w-[100px] object-contain opacity-80 filter brightness-0 invert"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-secondary" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-xs font-semibold text-primary-foreground/80 leading-tight max-w-[110px]">{award.title}</p>
                          {award.subtitle && <p className="text-[10px] text-primary-foreground/50 mt-0.5 leading-tight max-w-[110px]">{award.subtitle}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} {settings?.siteName || "Goa Houseboat"}. All rights reserved.
        </div>
      </footer>

      {/* Inquiry Modal */}
      <InquiryModal open={inquiryOpen} onClose={closeInquiry} initialData={inquiryPrefill ?? undefined} />

      {/* Floating WhatsApp Button */}
      {showWhatsapp && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform flex items-center justify-center group"
        >
          <Phone className="w-6 h-6" />
          <span className="absolute right-full mr-4 bg-white text-foreground px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
            WhatsApp us
          </span>
        </a>
      )}

      {/* Live Chat Widget */}
      {showChat && <ChatWidget color={chatWidgetColor} alignment={chatWidgetAlignment} />}
    </div>
  );
}
