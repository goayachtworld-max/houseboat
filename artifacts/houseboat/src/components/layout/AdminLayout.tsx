import { Link, useLocation } from "wouter";
import { authHeaders } from "@/hooks/use-admin-auth";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  LayoutDashboard, Package, Activity as ActivityIcon, Image as ImageIcon,
  FileText, Settings, LogOut, CalendarDays, Inbox, MessageSquare, Trophy,
  HelpCircle, Menu, X, PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";

import { API_BASE as API } from "@/lib/api-config";
const logo = "/images/logo_transparent.png";

const ADMIN_LINKS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Packages", href: "/packages", icon: Package },
  { name: "Activities", href: "/activities", icon: ActivityIcon },
  { name: "Gallery", href: "/gallery", icon: ImageIcon },
  { name: "Inquiries", href: "/inquiries", icon: Inbox },
  { name: "Live Chat", href: "/chat", icon: MessageSquare },
  { name: "Events", href: "/events", icon: PartyPopper },
  { name: "Awards", href: "/awards", icon: Trophy },
  { name: "FAQ", href: "/faqs", icon: HelpCircle },
  { name: "Blog Posts", href: "/blog", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, logout } = useAdminAuth();
  const [siteName, setSiteName] = useState("Shubhangi The Boat House");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`${API}/settings`, { ...authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.siteName) setSiteName(d.siteName);
        if (d.siteLogo) setSiteLogo(d.siteLogo);
      })
      .catch(() => {});
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted/30">Loading...</div>;
  }

  if (!isAuthenticated) {
    window.location.replace("/admin/login");
    return null;
  }

  const currentPage = ADMIN_LINKS.find(
    l => location === l.href || (l.href !== "/" && location.startsWith(l.href))
  )?.name || "Dashboard";

  const SidebarContent = () => (
    <>
      <div className="px-4 py-5 border-b border-border">
        <Link href="/" className="flex flex-col items-center gap-2 text-primary hover:text-primary/80 transition-colors group">
          <img
            src={siteLogo || logo}
            alt={siteName}
            className="h-14 w-full object-contain object-center"
          />
          <span className="hidden lg:block text-xs font-semibold text-center text-foreground/80 leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {siteName}
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {ADMIN_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-muted/20 font-sans">

      {/* ── Desktop sidebar (always visible ≥ lg) ───────────────────── */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col fixed h-full z-20">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile slide-out drawer ──────────────────────────────────── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-card border-r border-border flex flex-col z-40 transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0">

        {/* Top header (hamburger on mobile, page title always) */}
        <header className="h-14 lg:h-16 bg-card border-b border-border flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-20">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <h1 className="text-base lg:text-lg font-semibold text-foreground truncate">
            {currentPage}
          </h1>
        </header>

        <div className="p-4 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}