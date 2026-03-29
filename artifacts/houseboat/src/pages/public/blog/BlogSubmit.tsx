import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSendBlogOtp, useVerifyBlogOtp, useCreateBlogPost } from "@workspace/api-client-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

// Form schemas
const emailSchema = z.object({ email: z.string().email("Invalid email address") });
const otpSchema = z.object({ otp: z.string().length(6, "OTP must be 6 digits") });
const postSchema = z.object({
  title: z.string().min(5, "Title too short").max(100, "Title too long"),
  authorName: z.string().min(2, "Name required"),
  content: z.string().min(20, "Content must be at least 20 characters"),
});

export default function BlogSubmit() {
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  
  // State machine: email -> otp -> form -> success
  const [step, setStep] = useState<"email" | "otp" | "form" | "success">(isAuthenticated ? "form" : "email");
  const [userEmail, setUserEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");

  const sendOtpMutation = useSendBlogOtp();
  const verifyOtpMutation = useVerifyBlogOtp();
  const createPostMutation = useCreateBlogPost();

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse({ email: userEmail });
    if (!result.success) {
      toast({ title: "Error", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }
    try {
      await sendOtpMutation.mutateAsync({ data: { email: userEmail } });
      setStep("otp");
      toast({ title: "OTP Sent", description: "Check your email for the verification code." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send OTP", variant: "destructive" });
    }
  };

  const [otp, setOtp] = useState("");
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await verifyOtpMutation.mutateAsync({ data: { email: userEmail, otp } });
      setOtpToken(res.token);
      setStep("form");
      toast({ title: "Verified", description: "You can now write your story." });
    } catch (err: any) {
      toast({ title: "Invalid OTP", description: "Please check the code and try again.", variant: "destructive" });
    }
  };

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema)
  });

  const onSubmitPost = async (data: z.infer<typeof postSchema>) => {
    try {
      await createPostMutation.mutateAsync({
        data: {
          ...data,
          authorEmail: userEmail || undefined, // undefined if admin is posting directly
          otpToken: isAuthenticated ? undefined : otpToken, // Token only needed for guests
        }
      });
      setStep("success");
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "Something went wrong.", variant: "destructive" });
    }
  };

  return (
    <div className="pt-24 pb-24 bg-muted/20 min-h-screen flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-card rounded-3xl shadow-xl p-8 md:p-12 border border-border"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold text-primary mb-4">Share Your Story</h1>
          <p className="text-muted-foreground">
            {step === "email" && "Enter your email to get started. We use OTP to prevent spam."}
            {step === "otp" && `Enter the 6-digit code sent to ${userEmail}`}
            {step === "form" && "Tell us about your amazing experience aboard."}
            {step === "success" && "Thank you for sharing!"}
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleSendEmail} className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <Input 
                type="email" 
                placeholder="you@example.com" 
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={sendOtpMutation.isPending} size="lg">
              {sendOtpMutation.isPending ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Verification Code</label>
              <Input 
                type="text" 
                placeholder="123456" 
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="text-center tracking-[0.5em] text-2xl font-bold uppercase"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifyOtpMutation.isPending} size="lg">
              {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Continue"}
            </Button>
            <button type="button" onClick={() => setStep("email")} className="w-full text-sm text-muted-foreground hover:text-primary mt-2">
              Change email address
            </button>
          </form>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit(onSubmitPost)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <Input {...register("authorName")} placeholder="John Doe" />
                {errors.authorName && <p className="text-destructive text-sm">{errors.authorName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Story Title</label>
                <Input {...register("title")} placeholder="A Magical Sunset in Goa..." />
                {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Experience</label>
              <Textarea 
                {...register("content")} 
                placeholder="Tell us about the food, the views, the room..." 
                className="min-h-[200px]"
              />
              {errors.content && <p className="text-destructive text-sm">{errors.content.message}</p>}
            </div>

            {/* Note: In a real app with file upload API, we'd add an image uploader here. 
                For this spec, images are strings in the array. We will omit image upload in the guest form for simplicity unless an endpoint specifically supports multipart. */}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : (isAuthenticated ? "Publish Post" : "Submit for Review")}
            </Button>
            
            {!isAuthenticated && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                Your post will be published after a quick review by our team.
              </p>
            )}
          </form>
        )}

        {step === "success" && (
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center justify-center py-10"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Awesome!</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-8">
              {isAuthenticated 
                ? "Your post has been published successfully." 
                : "Your story has been submitted and is pending approval. It will appear on the blog soon!"}
            </p>
            <Button onClick={() => window.location.href = '/blog'} variant="outline">
              Back to Blog
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
