import { motion } from "framer-motion";
import { useListActivities } from "@workspace/api-client-react";
import * as LucideIcons from "lucide-react";

export default function Activities() {
  const { data: activities = [], isLoading } = useListActivities();

  const activeActivities = activities.filter(a => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="pt-24 pb-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-5xl font-display font-bold text-primary mb-6">Experiences & Activities</h1>
          <p className="text-lg text-muted-foreground">
            Enhance your stay with our curated selection of activities. Whether you seek adrenaline on the water 
            or peaceful sightseeing, we have something for everyone.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl mb-24"
        >
          <img 
            src={`${import.meta.env.BASE_URL}images/activities.png`} 
            alt="Activities" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeActivities.map((activity, idx) => {
            const IconComponent = (LucideIcons as any)[activity.icon] || LucideIcons.Activity;
            return (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card rounded-2xl p-8 shadow-lg border border-border hover:shadow-xl hover:border-secondary/50 transition-all group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-secondary/20 group-hover:text-secondary transition-all">
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-display font-bold text-primary mb-4">{activity.name}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {activity.description}
                </p>
                {activity.image && (
                  <div className="mt-6 rounded-xl overflow-hidden aspect-video">
                    <img src={activity.image} alt={activity.name} className="w-full h-full object-cover" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
