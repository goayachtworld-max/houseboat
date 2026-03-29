import { motion } from "framer-motion";
import { useListPackages, useGetSettings, useListActivities } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Check, Users, Tag, CalendarSearch, Anchor } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { useRef, useState, useEffect } from "react";

export default function Packages() {
  const { data: packages = [], isLoading } = useListPackages();
  const { data: settings } = useGetSettings();
  const { data: activities = [] } = useListActivities();
  const { fmt, currency } = useCurrency();

  const activePackages = packages.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const activeActivities = activities.filter(a => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const marqueeItems = activeActivities.length >= 2 ? activeActivities : [];

  // Drag-to-scroll refs
  const stripRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (!stripRef.current) return;
    setIsDragging(true);
    setPaused(true);
    dragStart.current = { x: e.pageX, scrollLeft: stripRef.current.scrollLeft };
    stripRef.current.style.cursor = "grabbing";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !stripRef.current) return;
    e.preventDefault();
    const dx = e.pageX - dragStart.current.x;
    stripRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  };
  const onMouseUp = () => {
    setIsDragging(false);
    if (stripRef.current) stripRef.current.style.cursor = "grab";
    setTimeout(() => setPaused(false), 800);
  };

  // JS auto-scroll — increments scrollLeft so drag uses same mechanism
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    let animId: number;
    const tick = () => {
      if (!paused && el) {
        el.scrollLeft += 0.6;
        // Loop: when we've scrolled past the first copy, jump back silently
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [paused]);

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="pt-24 pb-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-5xl font-display font-bold text-primary mb-6">Our Packages</h1>
          <p className="text-lg text-muted-foreground">
            Whether you're planning a romantic getaway, a family vacation, or a private party,
            we have the perfect package to make your stay unforgettable.
          </p>
        </div>

        <div className="space-y-16">
          {activePackages.map((pkg, idx) => {
            const isEven = idx % 2 === 0;

            const price = parseFloat(pkg.pricePerNight);
            const mrp = parseFloat((pkg as any).mrpPerNight ?? "");
            const hasOffer = !isNaN(price) && !isNaN(mrp) && mrp > price;
            const discountPct = hasOffer ? Math.round(((mrp - price) / mrp) * 100) : 0;

            const priceDisplay = fmt(pkg.pricePerNight);
            const mrpDisplay = fmt((pkg as any).mrpPerNight);

            const whatsappMsg = `Hi! I want to book the ${pkg.name} package for ${priceDisplay}/night.`;
            const waUrl = settings?.whatsappNumber
              ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`
              : "#";

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
              >
                {/* Image block */}
                <div className="w-full lg:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative">
                  <img
                    src={pkg.images?.[0] || `${import.meta.env.BASE_URL}images/bedroom.png`}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Capacity badge — top left */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary text-sm">Up to {pkg.capacity} Guests</span>
                  </div>

                  {/* Pricing badge — top right */}
                  {hasOffer ? (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl px-4 py-3 min-w-[150px]">
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Tag className="w-2.5 h-2.5" />
                          {discountPct}% OFF
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Package Price</p>
                      <p className="text-sm text-muted-foreground line-through leading-tight">
                        {mrpDisplay}<span className="text-xs not-italic">/night</span>
                      </p>
                      <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide mt-1.5">Offer Price</p>
                      <p className="text-lg font-bold text-green-700 leading-tight">
                        {priceDisplay}<span className="text-xs font-normal text-muted-foreground">/night</span>
                      </p>
                    </div>
                  ) : (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg text-right">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Price / Night</p>
                      <p className="text-lg font-bold text-primary leading-tight">{priceDisplay}</p>
                    </div>
                  )}
                </div>

                {/* Content block */}
                <div className="w-full lg:w-1/2">
                  <h2 className="text-4xl font-display font-bold text-primary mb-4">{pkg.name}</h2>

                  {/* Price display in text area */}
                  <div className="mb-6 flex items-baseline gap-3 flex-wrap">
                    <span className="text-4xl font-bold text-secondary">{priceDisplay}</span>
                    <span className="text-lg text-muted-foreground">/ per night</span>
                    {hasOffer && (
                      <>
                        <span className="text-xl text-muted-foreground line-through">{mrpDisplay}</span>
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-sm font-bold px-2.5 py-1 rounded-full">
                          <Tag className="w-3.5 h-3.5" />
                          Save {discountPct}%
                        </span>
                      </>
                    )}
                  </div>

                  {currency !== "INR" && (
                    <p className="text-xs text-muted-foreground mb-4 -mt-4">
                      Prices shown in {currency}. Actual billing in INR at time of booking.
                    </p>
                  )}

                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="bg-muted/30 rounded-xl p-6 mb-8 border border-border">
                    <h3 className="font-display font-bold text-lg mb-4 text-primary">What's Included</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pkg.inclusions?.map((inclusion, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <div className="mt-1 bg-secondary/20 p-1 rounded-full text-secondary">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{inclusion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <a href={waUrl} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="lg"
                        className="rounded-full px-10 text-lg w-full sm:w-auto text-white"
                        style={{ backgroundColor: "#25D366", borderColor: "#25D366" }}
                      >
                        Book via WhatsApp
                      </Button>
                    </a>
                    <a href="/#check-availability">
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full px-10 text-lg w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-white flex items-center gap-2"
                      >
                        <CalendarSearch className="w-5 h-5" />
                        Check Availability
                      </Button>
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Scrolling Activities Strip — image cards, drag-to-scroll */}
        {marqueeItems.length > 0 && (
          <div className="mt-20 -mx-4 border-y border-border bg-muted/30 py-10">
            <style>{`
              .act-strip::-webkit-scrollbar { display: none; }
              .act-strip { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Header */}
            <div className="px-8 mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">Experiences Aboard</p>
              <h3 className="text-xl font-display font-bold text-primary">Activities & Highlights</h3>
            </div>

            {/* Drag strip */}
            <div
              ref={stripRef}
              className="act-strip overflow-x-auto overflow-y-hidden select-none cursor-grab px-8"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <div className="flex gap-5" style={{ width: "max-content" }}>
                {[...marqueeItems, ...marqueeItems].map((activity, idx) => {
                  const Icon = (LucideIcons as any)[activity.icon] || Anchor;
                  return (
                    <div
                      key={idx}
                      className="shrink-0 w-48 rounded-2xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl transition-shadow duration-300 group"
                    >
                      {/* Image or icon placeholder */}
                      <div className="h-36 bg-primary/10 relative overflow-hidden">
                        {(activity as any).image ? (
                          <img
                            src={(activity as any).image}
                            alt={activity.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                            <Icon className="w-12 h-12 text-secondary/70" />
                          </div>
                        )}
                      </div>
                      {/* Name */}
                      <div className="px-4 py-3">
                        <p className="font-display font-bold text-sm text-primary leading-tight">{activity.name}</p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
