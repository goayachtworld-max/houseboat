import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE as API } from "@/lib/api-config";
import { setAuthToken } from "@/hooks/use-admin-auth";

const defaultLogo = "/images/logo_transparent.png";

const loginSchema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [siteName, setSiteName] = useState("Shubhangi The Boat House");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(d => {
        if (d.siteName) setSiteName(d.siteName);
        if (d.siteLogo) setSiteLogo(d.siteLogo);
      })
      .catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      // Store token in localStorage then navigate
      setAuthToken(json.token);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.refetchQueries({ queryKey: ["auth", "me"] });
      toast({ title: "Success", description: "Logged in successfully." });
      setLocation("/admin");
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Invalid credentials.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
        <div className="bg-primary p-8 text-center text-primary-foreground">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={siteLogo || defaultLogo} alt={siteName} className="h-14 w-auto object-contain drop-shadow-lg" />
            <h1 className="text-xl font-display font-bold leading-snug text-left">{siteName}</h1>
          </div>
          <p className="text-primary-foreground/70 text-sm mt-1">Sign in to manage the website</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Username</label>
              <Input {...register("username")} placeholder="admin" autoFocus />
              {errors.username && <p className="text-destructive text-sm">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input type="password" {...register("password")} placeholder="••••••••" />
              {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full mt-4" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Sign In
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setLocation("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Return to public website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}