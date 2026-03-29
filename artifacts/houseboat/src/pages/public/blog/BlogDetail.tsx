import { useRoute } from "wouter";
import { useGetBlogPostBySlug } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function BlogDetail() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";

  const { data: post, isLoading, error } = useGetBlogPostBySlug(slug, {
    query: {
      enabled: !!slug,
      retry: false
    }
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-4">Post not found</h2>
        <Link href="/blog" className="text-primary hover:underline">← Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header Image */}
      {post.images && post.images.length > 0 && (
        <div className="w-full h-[50vh] md:h-[60vh] relative">
          <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 relative z-10 -mt-20 md:-mt-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl shadow-xl p-8 md:p-12 border border-border"
        >
          <Link href="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to all stories
          </Link>

          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-10 pb-10 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {post.authorName}
                  {post.isAdminPost && <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full ml-2 align-middle">Admin</span>}
                </p>
                <p className="text-xs">Guest Author</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="w-4 h-4" />
              {format(new Date(post.publishedAt || post.createdAt), "MMMM d, yyyy")}
            </div>
          </div>

          <div className="prose prose-lg prose-headings:font-display prose-headings:text-primary max-w-none text-foreground/80 leading-relaxed">
            {post.content.split('\n').map((paragraph, i) => (
              paragraph ? <p key={i}>{paragraph}</p> : <br key={i} />
            ))}
          </div>

          {post.images && post.images.length > 1 && (
            <div className="mt-12 grid grid-cols-2 gap-4">
              {post.images.slice(1).map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden shadow-md aspect-video">
                  <img src={img} alt={`${post.title} gallery ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
