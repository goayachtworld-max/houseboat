import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListGallery } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const CATEGORIES = ["All", "Houseboat", "Dining", "Activities", "Guests"];

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { data: images = [], isLoading } = useListGallery();

  const filteredImages = activeCategory === "All" 
    ? images 
    : images.filter(img => img.category.toLowerCase() === activeCategory.toLowerCase());

  const sortedImages = [...filteredImages].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="pt-24 pb-24 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display font-bold text-primary mb-6">Photo Gallery</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            A glimpse into the luxurious life aboard our floating resort.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all",
                  activeCategory === cat 
                    ? "bg-primary text-white shadow-md" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <motion.div layout className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            <AnimatePresence>
              {sortedImages.map((img) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={img.id}
                  className="break-inside-avoid relative group cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
                  onClick={() => setSelectedImage(img.url)}
                >
                  <img src={img.url} alt={img.caption || "Gallery image"} className="w-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-sm font-medium">{img.caption}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12"
              onClick={() => setSelectedImage(null)}
            >
              <button 
                className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 rounded-full p-2"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-6 h-6" />
              </button>
              <motion.img 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={selectedImage} 
                alt="Enlarged" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
