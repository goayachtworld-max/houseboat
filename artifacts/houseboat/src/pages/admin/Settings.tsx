import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Globe, User, Shield, Mail, Phone, Lock,
  KeyRound, BadgeCheck, CalendarDays, Loader2, Eye, EyeOff,
  Upload, X, ImageIcon, Menu, Send, Server, CheckCircle, XCircle, LayoutGrid,
  Database, FolderOpen, FolderTree, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";


import { API_BASE as API } from "@/lib/api-config";

type Tab = "site" | "email" | "profile" | "deployment";

const ALL_NAV_ITEMS = [
  { key: "Home",       href: "/" },
  { key: "Packages",   href: "/packages" },
  { key: "Dining",     href: "/dining" },
  { key: "Activities", href: "/activities" },
  { key: "Gallery",    href: "/gallery" },
  { key: "Blog",       href: "/blog" },
  { key: "About",      href: "/about" },
];

// ─── helpers ───────────────────────────────────────────────────────────────
function scaleDown(dataUrl: string, maxPx = 800): Promise<string> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

// ─── schemas ───────────────────────────────────────────────────────────────
const siteSchema = z.object({
  siteName: z.string().min(1),
  tagline: z.string(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  heroImage: z.string(),
  whatsappNumber: z.string(),
  inquiryEmail: z.string().email(),
  socialInstagram: z.string().optional(),
  socialFacebook: z.string().optional(),
  socialYoutube: z.string().optional(),
  trailVideoUrl: z.string().optional(),
  trailTitle: z.string(),
  trailDescription: z.string(),
  locationMapUrl: z.string().optional(),
  aboutText: z.string(),
  aboutImages: z.string(),
});

const profileSchema = z.object({
  displayName: z.string(),
  email: z.string().email("Must be a valid email").or(z.literal("")),
  phone: z.string(),
  username: z.string().min(3, "Min 3 characters"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

interface AdminProfile {
  id: number;
  username: string;
  role: string;
  displayName: string;
  email: string;
  phone: string;
  createdAt: string;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function Field({ label, children, error, className }: { label: string; children: React.ReactNode; error?: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("site");

  // ── Logo state ─────────────────────────────────────────────────────────
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoChanged, setLogoChanged] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Nav menu state ──────────────────────────────────────────────────────
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [navSaving, setNavSaving] = useState(false);

  // ── Widget visibility state ──────────────────────────────────────────────
  const [showChatWidget, setShowChatWidget] = useState(true);
  const [chatWidgetColor, setChatWidgetColor] = useState("#10b981");
  const [chatWidgetAlignment, setChatWidgetAlignment] = useState<"left" | "right">("right");
  const [showWhatsappButton, setShowWhatsappButton] = useState(true);
  const [widgetSaving, setWidgetSaving] = useState(false);

  // ── Deployment settings state ───────────────────────────────────────────
  const [dbType, setDbType] = useState<"postgresql" | "mysql">("postgresql");
  const [dbHost, setDbHost] = useState("localhost");
  const [dbPort, setDbPort] = useState("3306");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPass, setDbPass] = useState("");
  const [showDbPass, setShowDbPass] = useState(false);
  const [deployDomain, setDeployDomain] = useState("");
  const [uploadRootPath, setUploadRootPath] = useState("/home/youruser/public_html/uploads");
  const [deploySaving, setDeploySaving] = useState(false);

  // ── Site settings form ─────────────────────────────────────────────────
  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Saved", description: "Site settings updated successfully." });
      }
    }
  });

  const siteForm = useForm<z.infer<typeof siteSchema>>({ resolver: zodResolver(siteSchema) });

  useEffect(() => {
    if (settings) {
      siteForm.reset({
        siteName: settings.siteName,
        tagline: settings.tagline,
        heroTitle: settings.heroTitle,
        heroSubtitle: settings.heroSubtitle,
        heroImage: settings.heroImage,
        whatsappNumber: settings.whatsappNumber,
        inquiryEmail: settings.inquiryEmail,
        socialInstagram: settings.socialInstagram || "",
        socialFacebook: settings.socialFacebook || "",
        socialYoutube: settings.socialYoutube || "",
        trailVideoUrl: settings.trailVideoUrl || "",
        trailTitle: (settings as any).trailTitle || "Our Trail",
        trailDescription: (settings as any).trailDescription || "Take a virtual tour of our regular cruise route. Watch as we navigate through mangroves, local fishing villages, and open waters.",
        locationMapUrl: (settings as any).locationMapUrl || "",
        aboutText: settings.aboutText,
        aboutImages: settings.aboutImages?.join(", ") || "",
      });
      setLogoPreview((settings as any).siteLogo || "");
      setHiddenItems((settings as any).navHiddenItems || []);
      setShowChatWidget((settings as any).showChatWidget !== "false");
      setChatWidgetColor((settings as any).chatWidgetColor || "#10b981");
      setChatWidgetAlignment(((settings as any).chatWidgetAlignment === "left" ? "left" : "right") as "left" | "right");
      setShowWhatsappButton((settings as any).showWhatsappButton !== "false");
      // Deployment settings
      setDbType(((settings as any).dbType === "mysql" ? "mysql" : "postgresql") as "postgresql" | "mysql");
      setDbHost((settings as any).dbHost || "localhost");
      setDbPort((settings as any).dbPort || "3306");
      setDbName((settings as any).dbName || "");
      setDbUser((settings as any).dbUser || "");
      setDbPass((settings as any).dbPass || "");
      setDeployDomain((settings as any).deployDomain || "");
      setUploadRootPath((settings as any).uploadRootPath || "/home/youruser/public_html/uploads");
    }
  }, [settings]);

  const onSiteSubmit = (data: z.infer<typeof siteSchema>) => {
    updateMutation.mutate({
      data: {
        ...data,
        aboutImages: data.aboutImages ? data.aboutImages.split(",").map(s => s.trim()) : [],
      }
    });
    // Also update the page title immediately
    document.title = `${data.siteName} | Luxury Houseboat Experience in Goa`;
  };

  // ── Logo handlers ───────────────────────────────────────────────────────
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const scaled = await scaleDown(raw, 800);
      setLogoPreview(scaled);
      setLogoChanged(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeLogo = () => {
    setLogoPreview("");
    setLogoChanged(true);
  };

  const saveLogo = async () => {
    setLogoSaving(true);
    try {
      const res = await fetch(`${API}/settings`, { credentials: "include", 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteLogo: logoPreview }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      setLogoChanged(false);
      toast({ title: "Logo saved", description: "Site logo updated across header and footer." });
    } catch {
      toast({ title: "Error", description: "Failed to save logo.", variant: "destructive" });
    } finally {
      setLogoSaving(false);
    }
  };

  // ── Nav menu handlers ────────────────────────────────────────────────────
  const toggleNavItem = (key: string) => {
    setHiddenItems(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const saveNavMenu = async () => {
    setNavSaving(true);
    try {
      const res = await fetch(`${API}/settings`, { credentials: "include", 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navHiddenItems: hiddenItems }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "Menu saved", description: "Navigation menu configuration updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save menu config.", variant: "destructive" });
    } finally {
      setNavSaving(false);
    }
  };

  // ── Widget visibility handlers ───────────────────────────────────────────
  const saveWidgets = async () => {
    setWidgetSaving(true);
    try {
      const res = await fetch(`${API}/settings`, { credentials: "include", 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showChatWidget: showChatWidget ? "true" : "false",
          chatWidgetColor,
          chatWidgetAlignment,
          showWhatsappButton: showWhatsappButton ? "true" : "false",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "Widget settings saved", description: "Floating widget visibility updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save widget settings.", variant: "destructive" });
    } finally {
      setWidgetSaving(false);
    }
  };

  // ── Email / SMTP state ───────────────────────────────────────────────────
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "",
    smtpFrom: "", smtpSecure: "false", notifyEmail: "",
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  useEffect(() => {
    if (settings) {
      setSmtpForm({
        smtpHost: (settings as any).smtpHost || "",
        smtpPort: (settings as any).smtpPort || "587",
        smtpUser: (settings as any).smtpUser || "",
        smtpPass: (settings as any).smtpPass || "",
        smtpFrom: (settings as any).smtpFrom || "",
        smtpSecure: (settings as any).smtpSecure || "false",
        notifyEmail: (settings as any).notifyEmail || "",
      });
    }
  }, [settings]);

  const saveSmtp = async () => {
    setSmtpSaving(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/settings`, { credentials: "include", 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpForm),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "Email settings saved", description: "SMTP configuration updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save SMTP settings.", variant: "destructive" });
    } finally {
      setSmtpSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setTestingSend(true);
    setTestResult(null);
    // Save first, then test
    try {
      await fetch(`${API}/settings`, { credentials: "include", 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpForm),
      });
      const res = await fetch(`${API}/email/test`, { credentials: "include",  method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ ok: true, msg: "Test email sent! Check your inbox." });
      } else {
        setTestResult({ ok: false, msg: data.error || "Failed to send test email." });
      }
    } catch {
      setTestResult({ ok: false, msg: "Network error. Check server connection." });
    } finally {
      setTestingSend(false);
    }
  };

  // ── Profile ──────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileForm = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile(data);
          profileForm.reset({
            displayName: data.displayName || "",
            email: data.email || "",
            phone: data.phone || "",
            username: data.username || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setProfileSaving(true);
    try {
      const res = await fetch(`${API}/auth/profile`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update");
      setProfile(prev => prev ? { ...prev, ...result.user } : prev);
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setPasswordSaving(true);
    try {
      const res = await fetch(`${API}/auth/profile`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update");
      passwordForm.reset();
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPasswordSaving(false);
    }
  };

  const saveDeploymentSettings = async () => {
    setDeploySaving(true);
    try {
      const res = await fetch(`${API}/settings`, { credentials: "include", 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // credentials: "include",
        body: JSON.stringify({
          dbType,
          dbHost,
          dbPort,
          dbName,
          dbUser,
          dbPass,
          deployDomain,
          uploadRootPath,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "Saved", description: "Deployment settings updated successfully." });
    } catch {
      toast({ title: "Error", description: "Could not save deployment settings.", variant: "destructive" });
    } finally {
      setDeploySaving(false);
    }
  };

  const IMAGE_FOLDERS = [
    { name: "gallery",     label: "Gallery images" },
    { name: "packages",    label: "Package images" },
    { name: "blog",        label: "Blog post images" },
    { name: "events",      label: "Event images" },
    { name: "activities",  label: "Activity images" },
    { name: "awards",      label: "Award / recognition images" },
    { name: "site",        label: "Logo, hero & about images" },
  ];

  const tabs = [
    { key: "site" as Tab, label: "Site Settings", icon: Globe },
    { key: "email" as Tab, label: "Email Settings", icon: Mail },
    { key: "profile" as Tab, label: "Admin Profile", icon: User },
    { key: "deployment" as Tab, label: "Deployment", icon: Server },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto w-full sm:w-fit [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === key
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── SITE SETTINGS TAB ─────────────────────────────────────────── */}
      {activeTab === "site" && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Site Settings</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your website content and contact information</p>
            </div>
            <Button onClick={siteForm.handleSubmit(onSiteSubmit)} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>

          {isLoading ? <div className="text-muted-foreground">Loading settings...</div> : (
            <div className="space-y-6">

              {/* ── LOGO SECTION ─────────────────────────────────────── */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-base">Site Logo</h3>
                  <p className="text-xs text-muted-foreground ml-auto">Displays in header (top-left) and footer (bottom-left)</p>
                </div>

                <div className="flex items-start gap-6 flex-wrap">
                  {/* Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-xs">No logo</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Header preview</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-20 rounded-lg border border-border bg-primary flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo footer preview" className="w-full h-full object-contain p-2 brightness-0 invert" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-white/40">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-xs">No logo</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Footer preview</span>
                  </div>

                  {/* Upload actions */}
                  <div className="flex flex-col gap-2 justify-center">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="w-4 h-4" /> Upload Logo
                    </Button>
                    {logoPreview && (
                      <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={removeLogo}>
                        <X className="w-4 h-4" /> Remove Logo
                      </Button>
                    )}
                    {logoChanged && (
                      <Button size="sm" className="gap-2" onClick={saveLogo} disabled={logoSaving}>
                        {logoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {logoSaving ? "Saving…" : "Save Logo"}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: PNG with transparent background. Max display height ~48px in header, ~64px in footer.
                </p>
              </div>

              {/* ── GENERAL & HERO ───────────────────────────────────── */}
              <form className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
                  <h3 className="font-bold text-base border-b border-border pb-3">General & Page Name</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Page / Site Name" className="md:col-span-2">
                      <Input {...siteForm.register("siteName")} placeholder="e.g. Shubhangi Floating House Boat" />
                      <p className="text-xs text-muted-foreground mt-1">This sets the browser tab title and the site name shown in the footer.</p>
                    </Field>
                    <Field label="Tagline (Footer)"><Input {...siteForm.register("tagline")} /></Field>
                    <Field label="Hero Title"><Input {...siteForm.register("heroTitle")} /></Field>
                    <Field label="Hero Subtitle"><Input {...siteForm.register("heroSubtitle")} /></Field>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
                  <h3 className="font-bold text-base border-b border-border pb-3">Contact & Social</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="WhatsApp Number (e.g. +919876543210)"><Input {...siteForm.register("whatsappNumber")} /></Field>
                    <Field label="Inquiry Email"><Input type="email" {...siteForm.register("inquiryEmail")} /></Field>
                    <Field label="Instagram URL"><Input {...siteForm.register("socialInstagram")} /></Field>
                    <Field label="Facebook URL"><Input {...siteForm.register("socialFacebook")} /></Field>
                    <Field label="YouTube URL"><Input {...siteForm.register("socialYoutube")} /></Field>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
                  <h3 className="font-bold text-base border-b border-border pb-3">About, Location & Trail</h3>
                  <Field label="Google Maps Embed URL">
                    <Input
                      {...siteForm.register("locationMapUrl")}
                      placeholder="https://www.google.com/maps/embed?pb=..."
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">In Google Maps, click Share → Embed a map → copy the <strong>src</strong> URL from the iframe code</p>
                  </Field>
                  <Field label="Trail Section Title"><Input {...siteForm.register("trailTitle")} placeholder="Our Trail" /></Field>
                  <Field label="Trail Section Description"><Textarea {...siteForm.register("trailDescription")} className="min-h-[80px]" placeholder="Describe the trail video section..." /></Field>
                  <Field label="YouTube Trail Video URL"><Input {...siteForm.register("trailVideoUrl")} placeholder="https://youtube.com/watch?v=..." /></Field>
                  <Field label="About Text"><Textarea {...siteForm.register("aboutText")} className="min-h-[140px]" /></Field>
                </div>
              </form>

              {/* ── NAV MENU CONFIG ──────────────────────────────────── */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Menu className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-base">Navigation Menu</h3>
                  </div>
                  <Button size="sm" className="gap-2" onClick={saveNavMenu} disabled={navSaving}>
                    {navSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {navSaving ? "Saving…" : "Save Menu"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Toggle which pages appear in the public navigation bar. Hidden pages are still accessible via direct URL.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_NAV_ITEMS.map((item) => {
                    const isVisible = !hiddenItems.includes(item.key);
                    return (
                      <label
                        key={item.key}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none",
                          isVisible
                            ? "bg-primary/5 border-primary/30 text-foreground"
                            : "bg-muted/40 border-border text-muted-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0",
                          isVisible ? "bg-primary border-primary" : "bg-background border-border"
                        )}>
                          {isVisible && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isVisible}
                          onChange={() => toggleNavItem(item.key)}
                        />
                        <div>
                          <p className="text-sm font-medium">{item.key}</p>
                          <p className="text-xs opacity-60">{item.href}</p>
                        </div>
                        <span className={cn(
                          "ml-auto text-xs px-2 py-0.5 rounded-full font-medium",
                          isVisible ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                        )}>
                          {isVisible ? "Visible" : "Hidden"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Widget Visibility ─────────────────────────────────────── */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-base">Floating Widget Visibility</h3>
                  </div>
                  <Button size="sm" onClick={saveWidgets} disabled={widgetSaving} className="gap-2">
                    {widgetSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Toggle whether the chat bubble and WhatsApp button appear on the public site, and customise the chat widget appearance.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Live Chat Widget", desc: "Floating chat bubble for visitors", value: showChatWidget, set: setShowChatWidget },
                    { label: "WhatsApp Button", desc: "Floating WhatsApp contact button", value: showWhatsappButton, set: setShowWhatsappButton },
                  ].map(({ label, desc, value, set }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => set(!value)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors text-left w-full",
                        value ? "bg-primary/5 border-primary/30" : "bg-muted/40 border-border"
                      )}
                    >
                      <div className={cn(
                        "relative w-10 h-6 rounded-full transition-colors shrink-0",
                        value ? "bg-primary" : "bg-muted-foreground/30"
                      )}>
                        <span className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                          value ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <span className={cn(
                        "ml-auto text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                        value ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      )}>
                        {value ? "Visible" : "Hidden"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Chat widget appearance */}
                <div className="pt-2 border-t border-border space-y-4">
                  <p className="text-sm font-medium text-foreground">Chat Widget Appearance</p>

                  {/* Color picker */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Button & Accent Color</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#ec4899", "#0ea5e9", "#14b8a6"].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setChatWidgetColor(preset)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                            chatWidgetColor === preset ? "border-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: preset }}
                          title={preset}
                        />
                      ))}
                      <div className="flex items-center gap-2 ml-1">
                        <input
                          type="color"
                          value={chatWidgetColor}
                          onChange={e => setChatWidgetColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-border"
                          title="Custom color"
                        />
                        <span className="text-xs text-muted-foreground font-mono">{chatWidgetColor}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Preview:</span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: chatWidgetColor }}>
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Widget Position</label>
                    <div className="flex gap-3">
                      {(["left", "right"] as const).map(side => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setChatWidgetAlignment(side)}
                          className={cn(
                            "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
                            chatWidgetAlignment === side ? "bg-primary/10 border-primary text-primary" : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          <div className="w-20 h-10 bg-background border border-border rounded relative">
                            <div
                              className="absolute bottom-1 w-5 h-5 rounded-full"
                              style={{ backgroundColor: chatWidgetColor, [side === "left" ? "left" : "right"]: 4 }}
                            />
                          </div>
                          Bottom {side.charAt(0).toUpperCase() + side.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ── EMAIL SETTINGS TAB ────────────────────────────────────────── */}
      {activeTab === "email" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Email Settings</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Configure SMTP to receive inquiry notifications by email</p>
            </div>
            <Button onClick={saveSmtp} disabled={smtpSaving} className="gap-2">
              {smtpSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </Button>
          </div>

          {/* Notification email */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">Notification Email</h3>
            </div>
            <Field label="Send Inquiry Notifications To">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-9"
                  placeholder="owner@example.com"
                  value={smtpForm.notifyEmail}
                  onChange={e => setSmtpForm(f => ({ ...f, notifyEmail: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">When a guest submits an inquiry, a notification email will be sent to this address.</p>
            </Field>
          </div>

          {/* SMTP Configuration */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Server className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">SMTP Configuration</h3>
              <p className="text-xs text-muted-foreground ml-auto">Works with Gmail, Outlook, Zoho, any SMTP server</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="SMTP Host" className="sm:col-span-2">
                <Input
                  placeholder="smtp.gmail.com"
                  value={smtpForm.smtpHost}
                  onChange={e => setSmtpForm(f => ({ ...f, smtpHost: e.target.value }))}
                />
              </Field>
              <Field label="Port">
                <Input
                  placeholder="587"
                  value={smtpForm.smtpPort}
                  onChange={e => setSmtpForm(f => ({ ...f, smtpPort: e.target.value }))}
                />
              </Field>
              <Field label="Security">
                <select
                  value={smtpForm.smtpSecure}
                  onChange={e => setSmtpForm(f => ({ ...f, smtpSecure: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="false">STARTTLS (port 587)</option>
                  <option value="true">SSL/TLS (port 465)</option>
                </select>
              </Field>
              <Field label="Username / Email">
                <Input
                  placeholder="your@gmail.com"
                  value={smtpForm.smtpUser}
                  onChange={e => setSmtpForm(f => ({ ...f, smtpUser: e.target.value }))}
                />
              </Field>
              <Field label="Password / App Password">
                <div className="relative">
                  <Input
                    type={showSmtpPass ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={smtpForm.smtpPass}
                    onChange={e => setSmtpForm(f => ({ ...f, smtpPass: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-primary">App Password</a> (not your regular password).</p>
              </Field>
              <Field label="From Name / Email" className="sm:col-span-2">
                <Input
                  placeholder="Shubhangi The Boat House <noreply@yourdomain.com>"
                  value={smtpForm.smtpFrom}
                  onChange={e => setSmtpForm(f => ({ ...f, smtpFrom: e.target.value }))}
                />
              </Field>
            </div>
          </div>

          {/* Quick reference */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">Common SMTP Providers</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[
                { name: "Gmail", host: "smtp.gmail.com", port: "587", note: "Use App Password" },
                { name: "Outlook / Hotmail", host: "smtp.office365.com", port: "587", note: "Use your password" },
                { name: "Zoho Mail", host: "smtp.zoho.com", port: "587", note: "Use your password" },
              ].map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setSmtpForm(f => ({ ...f, smtpHost: p.host, smtpPort: p.port, smtpSecure: "false" }))}
                  className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors"
                >
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.host}:{p.port}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{p.note}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Test email */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Send className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">Test Email</h3>
            </div>
            <p className="text-sm text-muted-foreground">Send a test inquiry email to verify your SMTP settings are working correctly. Settings will be saved before sending.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <Button onClick={sendTestEmail} disabled={testingSend} variant="outline" className="gap-2">
                {testingSend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Test Email
              </Button>
              {testResult && (
                <div className={cn("flex items-center gap-2 text-sm font-medium", testResult.ok ? "text-green-600" : "text-destructive")}>
                  {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN PROFILE TAB ─────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Admin Profile</h2>
            <p className="text-sm text-muted-foreground mt-0.5">View your account details and update your profile</p>
          </div>

          {profileLoading ? (
            <div className="flex items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading profile...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT — read-only admin details */}
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-bold text-primary">
                      {(profile?.displayName || profile?.username || "A").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-bold text-foreground text-lg">{profile?.displayName || profile?.username}</p>
                  <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {profile?.role?.charAt(0).toUpperCase()}{profile?.role?.slice(1)}
                  </span>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-1">Admin Details</h3>
                  <p className="text-xs text-muted-foreground mb-4">Your account information</p>
                  <InfoRow icon={User} label="Username" value={`@${profile?.username}`} />
                  <InfoRow icon={Shield} label="Role" value={profile?.role || ""} />
                  <InfoRow icon={Mail} label="Email" value={profile?.email || "Not set"} />
                  <InfoRow icon={Phone} label="Phone" value={profile?.phone || "Not set"} />
                  <InfoRow icon={CalendarDays} label="Member Since" value={
                    profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                      : ""
                  } />
                </div>
              </div>

              {/* RIGHT — editable forms */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-foreground">User Details</h3>
                  </div>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Display Name">
                        <Input {...profileForm.register("displayName")} placeholder="Your full name" />
                      </Field>
                      <Field label="Username" error={profileForm.formState.errors.username?.message}>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                          <Input {...profileForm.register("username")} className="pl-7" placeholder="admin" />
                        </div>
                      </Field>
                      <Field label="Email Address" error={profileForm.formState.errors.email?.message}>
                        <Input type="email" {...profileForm.register("email")} placeholder="admin@example.com" />
                      </Field>
                      <Field label="Phone Number">
                        <Input {...profileForm.register("phone")} placeholder="+91 98765 43210" />
                      </Field>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={profileForm.handleSubmit(onProfileSubmit)} disabled={profileSaving} className="gap-2">
                        {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Update Profile
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-foreground">Admin Settings</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">Change your login password. You'll need to know your current password.</p>
                  <form className="space-y-4">
                    <Field label="Current Password" error={passwordForm.formState.errors.currentPassword?.message}>
                      <div className="relative">
                        <Input
                          type={showCurrent ? "text" : "password"}
                          {...passwordForm.register("currentPassword")}
                          placeholder="Enter current password"
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="New Password" error={passwordForm.formState.errors.newPassword?.message}>
                        <div className="relative">
                          <Input
                            type={showNew ? "text" : "password"}
                            {...passwordForm.register("newPassword")}
                            placeholder="Min 6 characters"
                            className="pr-10"
                          />
                          <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </Field>
                      <Field label="Confirm New Password" error={passwordForm.formState.errors.confirmPassword?.message}>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            {...passwordForm.register("confirmPassword")}
                            placeholder="Repeat new password"
                            className="pr-10"
                          />
                          <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </Field>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={passwordForm.handleSubmit(onPasswordSubmit)}
                        disabled={passwordSaving}
                        className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Change Password
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEPLOYMENT TAB ────────────────────────────────────────────── */}
      {activeTab === "deployment" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Deployment Configuration</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Configure your database, domain, and image storage for self-hosting on your own server.</p>
          </div>

          {/* ── Database type ───────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Database className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">Database</h3>
            </div>
            <p className="text-sm text-muted-foreground">Select the database engine you are using on your hosting server.</p>

            {/* Type selector cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["postgresql", "mysql"] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDbType(type)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                    dbType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                    dbType === type ? "border-primary" : "border-muted-foreground/40"
                  )}>
                    {dbType === type && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      {type === "postgresql" ? "PostgreSQL" : "MySQL"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {type === "postgresql"
                        ? "Replit-managed PostgreSQL (current setup)"
                        : "External MySQL / cPanel database"}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* PostgreSQL info box */}
            {dbType === "postgresql" && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-semibold">Using Replit PostgreSQL</p>
                  <p className="mt-0.5 text-blue-700">The application is connected automatically via the <code className="bg-blue-100 px-1 rounded">DATABASE_URL</code> environment variable. No credentials needed here.</p>
                </div>
              </div>
            )}

            {/* MySQL credential fields */}
            {dbType === "mysql" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Field label="Database Host">
                  <Input
                    placeholder="localhost or your cPanel host"
                    value={dbHost}
                    onChange={e => setDbHost(e.target.value)}
                  />
                </Field>
                <Field label="Port">
                  <Input
                    placeholder="3306"
                    value={dbPort}
                    onChange={e => setDbPort(e.target.value)}
                  />
                </Field>
                <Field label="Database Name">
                  <Input
                    placeholder="e.g. cpanelusername_houseboatdb"
                    value={dbName}
                    onChange={e => setDbName(e.target.value)}
                  />
                </Field>
                <Field label="Database Username">
                  <Input
                    placeholder="e.g. cpanelusername_dbuser"
                    value={dbUser}
                    onChange={e => setDbUser(e.target.value)}
                  />
                </Field>
                <Field label="Database Password" className="sm:col-span-2">
                  <div className="relative">
                    <Input
                      type={showDbPass ? "text" : "password"}
                      placeholder="Your database password"
                      value={dbPass}
                      onChange={e => setDbPass(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDbPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showDbPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                {/* Generated connection string preview */}
                {dbHost && dbName && dbUser && (
                  <div className="sm:col-span-2 bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground break-all">
                    mysql://{dbUser}:{dbPass ? "••••••" : "<password>"}@{dbHost}:{dbPort}/{dbName}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Domain ──────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">Application Domain</h3>
            </div>
            <p className="text-sm text-muted-foreground">The URL where your houseboat website will be publicly accessible.</p>
            <Field label="Domain URL">
              <Input
                placeholder="https://yourdomain.com"
                value={deployDomain}
                onChange={e => setDeployDomain(e.target.value)}
              />
            </Field>
            {deployDomain && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                Public site: <span className="font-medium text-foreground ml-1">{deployDomain.replace(/\/$/, "")}/</span>
              </div>
            )}
          </div>

          {/* ── Image storage ───────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <FolderTree className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-base">Image Storage Path</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              The root folder on your server where uploaded images will be stored. On cPanel this is usually inside <code className="bg-muted px-1.5 py-0.5 rounded text-xs">public_html</code>.
            </p>
            <Field label="Upload Root Folder (absolute path on server)">
              <Input
                placeholder="/home/youruser/public_html/uploads"
                value={uploadRootPath}
                onChange={e => setUploadRootPath(e.target.value)}
              />
            </Field>

            {/* Live folder tree preview */}
            {uploadRootPath && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Folder structure preview</p>
                <div className="bg-muted rounded-xl p-4 font-mono text-xs space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    {uploadRootPath.replace(/\/$/, "")}/
                  </div>
                  {IMAGE_FOLDERS.map((folder, idx) => {
                    const isLast = idx === IMAGE_FOLDERS.length - 1;
                    return (
                      <div key={folder.name} className="flex items-center gap-1.5 pl-4">
                        <span className="text-border select-none">{isLast ? "└─" : "├─"}</span>
                        <FolderOpen className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-foreground">{folder.name}/</span>
                        <span className="text-muted-foreground/60 ml-1">← {folder.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Full path example */}
                <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                  <p className="text-xs font-semibold text-primary mb-1">Example — a gallery image will be saved as:</p>
                  <code className="text-foreground break-all">
                    {uploadRootPath.replace(/\/$/, "")}/gallery/IMG_20240101_001.jpg
                  </code>
                  {deployDomain && (
                    <>
                      <p className="text-xs font-semibold text-primary mt-2 mb-1">And accessed publicly at:</p>
                      <code className="text-foreground break-all">
                        {deployDomain.replace(/\/$/, "")}/uploads/gallery/IMG_20240101_001.jpg
                      </code>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Save button ─────────────────────────────────────────── */}
          <div className="flex justify-end">
            <Button onClick={saveDeploymentSettings} disabled={deploySaving} className="gap-2">
              {deploySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Deployment Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
