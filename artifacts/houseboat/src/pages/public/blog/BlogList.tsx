import { motion } from "framer-motion";
import { Link } from "wouter";
import { useListBlogPosts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, User, PenSquare } from "lucide-react";

export default function BlogList() {
  const { data, isLoading } = useListBlogPosts({ query: { page: 1, limit: 20 } });

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const posts = data?.posts || [];

  return (
    <div className="pt-24 pb-24 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-display font-bold text-primary mb-4">Guest Experiences</h1>
            <p className="text-lg text-muted-foreground">
              Read stories and memories shared by our wonderful guests. Have you stayed with us? We'd love to hear your story!
            </p>
          </div>
          <Link href="/blog/submit">
            <Button className="rounded-full flex items-center gap-2">
              <PenSquare className="w-4 h-4" />
              Write a Post
            </Button>
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground text-lg mb-4">No stories published yet. Be the first to share your experience!</p>
            <Link href="/blog/submit">
              <Button variant="outline">Share Experience</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, idx) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card rounded-2xl overflow-hidden shadow-lg border border-border flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all group"
              >
                {post.images && post.images.length > 0 ? (
                  <Link href={`/blog/${post.slug}`} className="aspect-video overflow-hidden block">
                    <img 
                      src={post.images[0]} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                ) : (
                  <Link href={`/blog/${post.slug}`} className="aspect-video bg-primary/5 flex items-center justify-center block">
                    <span className="text-primary/30 font-display text-2xl font-bold">Story</span>
                  </Link>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(post.publishedAt || post.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.authorName}
                      {post.isAdminPost && <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full ml-1">Admin</span>}
                    </div>
                  </div>
                  
                  <Link href={`/blog/${post.slug}`}>
                    <h3 className="text-2xl font-display font-bold text-foreground mb-3 hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                  
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                    {post.excerpt || post.content.substring(0, 150) + "..."}
                  </p>
                  
                  <Link href={`/blog/${post.slug}`} className="text-secondary font-semibold text-sm hover:underline mt-auto">
                    Read Full Story →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
