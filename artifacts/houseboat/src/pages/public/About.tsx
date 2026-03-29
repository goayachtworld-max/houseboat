import { API_BASE } from "@/lib/api-config";
import { useGetSettings } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Navigation, Play, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Award {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
}



export default function About() {
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

  const mapUrl = (settings as any)?.locationMapUrl || "";
  const trailVideoUrl = settings?.trailVideoUrl || "";

  return (
    <div className="pt-24 pb-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Header */}
        <div className="text-center mb-16">
          <p className="text-secondary font-semibold text-sm uppercase tracking-widest mb-3">Find Us</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-6">Our Story & Location</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the rich heritage of Goan backwaters aboard our meticulously crafted wooden houseboat.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="prose prose-lg text-muted-foreground"
          >
            <h2 className="text-3xl font-display font-bold text-primary mb-6">The Floating Haven</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {settings?.aboutText || "Built by master craftsmen using traditional methods, our houseboat represents a perfect synergy between cultural heritage and modern luxury. Cruising through the serene backwaters of Goa, it offers a unique vantage point to witness the vibrant local ecosystem and untouched natural beauty."}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We pride ourselves on offering a sustainable yet lavish experience. Our dedicated crew ensures your every need is met, from gourmet dining on the rooftop deck to guiding you through hidden waterways on kayaks.
            </p>
          </motion.div>

          {/* Map embed — only shown when configured */}
          {mapUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="rounded-2xl overflow-hidden shadow-xl border border-border aspect-[4/3] bg-muted/30 relative">
                <iframe
                  src={mapUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Shubhangi The Boat House Location"
                />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="w-4 h-4 text-primary shrink-0" />
                <span>Chapora River, North Goa — Click the map to get directions</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Trail Video Section */}
        <div className="bg-muted/30 rounded-3xl p-8 md:p-16 border border-border text-center">
          <h2 className="text-3xl font-display font-bold text-primary mb-4">
            {settings?.trailTitle || "Our Trail"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
            {settings?.trailDescription || "Take a virtual tour of our regular cruise route. Watch as we navigate through mangroves, local fishing villages, and open waters."}
          </p>

          <div className="aspect-video w-full max-w-4xl mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl relative">
            {trailVideoUrl ? (
              <iframe
                src={trailVideoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Houseboat trail video"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center flex-col text-white/50">
                <img
                  src={`${import.meta.env.BASE_URL}images/about.png`}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                  alt="Houseboat"
                />
                <div className="z-10 bg-black/60 p-6 rounded-full backdrop-blur-sm border border-white/20">
                  <Play className="w-12 h-12 text-white ml-1" fill="currentColor" />
                </div>
                <p className="z-10 mt-4 font-medium">Video Tour — Coming Soon</p>
              </div>
            )}
          </div>
        </div>

        {/* Awards & Recognition — only shown when admin has added awards */}
        {activeAwards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-24"
          >
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 text-secondary mb-3">
                <Trophy className="w-5 h-5" />
                <p className="font-semibold text-sm uppercase tracking-widest">Awards & Recognition</p>
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="text-3xl font-display font-bold text-primary">Honoured by the Best</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-8 md:gap-14">
              {activeAwards.map(award => (
                <motion.div
                  key={award.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center gap-3 group"
                >
                  {award.link ? (
                    <a href={award.link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3">
                      {award.image ? (
                        <img src={award.image} alt={award.title} className="h-16 w-auto max-w-[120px] object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-secondary/10 border-2 border-secondary/20 flex items-center justify-center group-hover:border-secondary/50 transition-colors">
                          <Trophy className="w-7 h-7 text-secondary" />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors leading-tight max-w-[130px]">{award.title}</p>
                        {award.subtitle && <p className="text-xs text-muted-foreground mt-1 leading-tight max-w-[130px]">{award.subtitle}</p>}
                      </div>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      {award.image ? (
                        <img src={award.image} alt={award.title} className="h-16 w-auto max-w-[120px] object-contain opacity-80" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-secondary/10 border-2 border-secondary/20 flex items-center justify-center">
                          <Trophy className="w-7 h-7 text-secondary" />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-primary leading-tight max-w-[130px]">{award.title}</p>
                        {award.subtitle && <p className="text-xs text-muted-foreground mt-1 leading-tight max-w-[130px]">{award.subtitle}</p>}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
