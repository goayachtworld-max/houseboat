import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Public Pages
import Home from "@/pages/public/Home";
import Packages from "@/pages/public/Packages";
import Events from "@/pages/public/Events";
import Activities from "@/pages/public/Activities";
import Gallery from "@/pages/public/Gallery";
import BlogList from "@/pages/public/blog/BlogList";
import BlogDetail from "@/pages/public/blog/BlogDetail";
import BlogSubmit from "@/pages/public/blog/BlogSubmit";
import About from "@/pages/public/About";

// Admin Pages
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminPackages from "@/pages/admin/Packages";
import AdminBlog from "@/pages/admin/Blog";
import AdminSettings from "@/pages/admin/Settings";
import AdminCalendar from "@/pages/admin/Calendar";
import AdminGallery from "@/pages/admin/Gallery";
import AdminInquiries from "@/pages/admin/Inquiries";
import AdminChat from "@/pages/admin/Chat";
import AdminActivities from "@/pages/admin/Activities";
import AdminAwards from "@/pages/admin/Awards";
import AdminFaqs from "@/pages/admin/Faqs";
import AdminEvents from "@/pages/admin/Events";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

function Router() {
  return (
    <Switch>
      {/* Admin Auth Route (No Layout) */}
      <Route path="/admin/login" component={AdminLogin} />

      {/* Admin Routes */}
      <Route path="/admin" nest>
        <AdminLayout>
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/calendar" component={AdminCalendar} />
            <Route path="/packages" component={AdminPackages} />
            <Route path="/activities" component={AdminActivities} />
            <Route path="/gallery" component={AdminGallery} />
            <Route path="/inquiries" component={AdminInquiries} />
            <Route path="/chat" component={AdminChat} />
            <Route path="/awards" component={AdminAwards} />
            <Route path="/faqs" component={AdminFaqs} />
            <Route path="/events" component={AdminEvents} />
            <Route path="/blog" component={AdminBlog} />
            <Route path="/settings" component={AdminSettings} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>

      {/* Public Routes */}
      <Route path="/" nest>
        <PublicLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/packages" component={Packages} />
            <Route path="/events" component={Events} />
            <Route path="/activities" component={Activities} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/blog" component={BlogList} />
            <Route path="/blog/submit" component={BlogSubmit} />
            <Route path="/blog/:slug" component={BlogDetail} />
            <Route path="/about" component={About} />
            <Route component={NotFound} />
          </Switch>
        </PublicLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
