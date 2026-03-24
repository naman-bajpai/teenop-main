"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export default function LoginPage() {
  // Wrap the hook-using component in Suspense to satisfy Next.js
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <div className="text-gray-600">Loading…</div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submitLock, setSubmitLock] = useState(false);

  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  // Countdown timer effect
  useEffect(() => {
    if (countdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setError("");
    }
  }, [countdown]);

  // Helper function to check if we should wait before retrying
  const shouldWaitForRetry = () => {
    if (!lastAttemptTime) return false;
    const timeSinceLastAttempt = Date.now() - lastAttemptTime;
    // Longer wait time for rate limit scenarios
    const waitTime = Math.min(1000 * Math.pow(2, retryCount), 60000); // Max 60 seconds
    return timeSinceLastAttempt < waitTime;
  };

  // Helper function to check if error is a rate limit error
  const isRateLimitError = (error: any) => {
    const errorMessage = error?.message?.toLowerCase() || "";
    const errorStatus = error?.status || error?.code;
    
    return (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests") ||
      errorStatus === 429 ||
      errorStatus === "429" ||
      error?.name === "AuthApiError" && (errorMessage.includes("rate") || errorStatus === 429)
    );
  };

  // Helper function to get user-friendly error message
  const getErrorMessage = (error: any) => {
    if (isRateLimitError(error)) {
      return "Too many login attempts. Please wait a moment and try again.";
    }
    if (error?.message?.includes("Invalid login credentials")) {
      return "Invalid email or password. Please check your credentials and try again.";
    }
    if (error?.message?.includes("Email not confirmed")) {
      return "Please check your email and click the confirmation link before signing in.";
    }
    if (error?.message?.includes("User not found")) {
      return "No account found with this email address. Please sign up first.";
    }
    return error?.message || "Login failed. Please try again.";
  };

  // Validation functions
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return "Email is required";
    }
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    if (email.length > 254) {
      return "Email address is too long";
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (password.length > 128) {
      return "Password is too long";
    }
    // Check for potentially dangerous characters
    if (/[<>]/.test(password)) {
      return "Password contains invalid characters";
    }
    return null;
  };

  const sanitizeInput = (value: string): string => {
    // Remove leading/trailing whitespace and prevent XSS
    return value.trim().replace(/[<>]/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Sanitize text inputs
    const sanitizedValue = type === "checkbox" ? checked : (type === "email" ? sanitizeInput(value) : value);
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : sanitizedValue,
    }));
    
    // Real-time validation (only for string inputs)
    if (name === "email" && type !== "checkbox" && typeof sanitizedValue === "string") {
      const emailError = validateEmail(sanitizedValue);
      setFieldErrors(prev => ({ ...prev, email: emailError || undefined }));
    } else if (name === "password" && type !== "checkbox") {
      const passwordError = validatePassword(value);
      setFieldErrors(prev => ({ ...prev, password: passwordError || undefined }));
    }
    
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent rapid-fire submissions
    if (submitLock || isSubmitting) {
      return;
    }
    
    // Validate form fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    
    if (emailError || passwordError) {
      setFieldErrors({
        email: emailError || undefined,
        password: passwordError || undefined,
      });
      setError(emailError || passwordError || "Please fix the errors above");
      return;
    }
    
    // Check if we should wait before retrying
    if (shouldWaitForRetry()) {
      const timeSinceLastAttempt = Date.now() - (lastAttemptTime || 0);
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 60000);
      const remainingTime = Math.ceil((waitTime - timeSinceLastAttempt) / 1000);
      setCountdown(remainingTime);
      setError(`Please wait ${remainingTime} seconds before trying again.`);
      return;
    }

    // Minimum delay between requests (1 second) to prevent rapid submissions
    const minDelay = 1000;
    if (lastAttemptTime) {
      const timeSinceLastAttempt = Date.now() - lastAttemptTime;
      if (timeSinceLastAttempt < minDelay) {
        const remaining = Math.ceil((minDelay - timeSinceLastAttempt) / 1000);
        setError(`Please wait ${remaining} second${remaining !== 1 ? 's' : ''} before trying again.`);
        return;
      }
    }

    setSubmitLock(true);
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});
    setLastAttemptTime(Date.now());

    try {
      const supabase = createClient();
      console.log("Attempting login for:", formData.email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      console.log("Login response:", { data, error });

      if (error) {
        console.error("Login error:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name,
        });
        
        // Handle rate limiting specifically
        if (isRateLimitError(error)) {
          setRetryCount(prev => prev + 1);
          const waitTime = Math.min(1000 * Math.pow(2, retryCount + 1), 60000); // Max 60 seconds for rate limits
          const remainingTime = Math.ceil(waitTime / 1000);
          setCountdown(remainingTime);
          setError(getErrorMessage(error));
          setIsSubmitting(false);
          return;
        }
        
        // Reset retry count for non-rate-limit errors
        setRetryCount(0);
        setError(getErrorMessage(error));
        setIsSubmitting(false);
        return;
      }

      // Reset retry count on successful login
      setRetryCount(0);

      if (data.user) {
        console.log("User authenticated:", data.user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        console.log("Profile fetch result:", { profile, profileError });

        if (profileError || !profile) {
          console.error("Profile error:", profileError);
          setError("User profile not found. Please contact support.");
          setIsSubmitting(false);
          return;
        }

        if (profile.status === "pending_verification" && profile.role === "teen") {
          setError("Pending Approval: your parent or guardian still needs to approve your TeenOp account before it can go live.");
          router.push("/pending-approval");
          setIsSubmitting(false);
          return;
        }

        if (data.session) {
          await supabase.auth.setSession(data.session);
          console.log("Session persisted successfully");
          
          // Wait a bit to ensure cookies are set before redirecting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log("Login successful, redirecting to:", redirectTo);
        
        // Store current pathname to check if redirect worked
        const currentPath = window.location.pathname;
        
        // Use router.push for client-side navigation
        router.push(redirectTo);
        
        // Fallback to window.location if router doesn't work
        // This ensures redirect happens even if router.push fails
        setTimeout(() => {
          // Check if we're still on the login page (redirect didn't work)
          if (window.location.pathname === currentPath || window.location.pathname === '/login') {
            console.log("Router push may have failed, using window.location fallback");
            window.location.href = redirectTo;
          }
        }, 500);
      }
    } catch (err: any) {
      console.error("Login exception:", err);
      
      // Check if it's a rate limit error in the catch block too
      if (isRateLimitError(err)) {
        setRetryCount(prev => prev + 1);
        const waitTime = Math.min(1000 * Math.pow(2, retryCount + 1), 60000);
        const remainingTime = Math.ceil(waitTime / 1000);
        setCountdown(remainingTime);
        setError(getErrorMessage(err));
      } else {
        setRetryCount(prev => prev + 1);
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
      // Release lock after a minimum delay
      setTimeout(() => {
        setSubmitLock(false);
      }, 1000);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <Image
        src="/images/Sign In Background1.jpg"
        alt=""
        fill
        priority
        aria-hidden
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/20 to-slate-950/55" />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/newlogo copy.png" alt="TeenOp" width={220} height={48} className="h-8 w-auto brightness-0 invert sm:h-9" priority />
          </Link>
          <Link href="/signup" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15">
            Sign up
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-8">
            <div className="mb-7">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Login</h2>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <div>
                  <span className="text-sm text-red-700">{error}</span>
                  {countdown && countdown > 0 && (
                    <div className="mt-1 text-xs text-red-500">Retry in {countdown}s</div>
                  )}
                </div>
              </div>
            )}

            {FEATURE_FLAGS.enablePendingStorefrontDrafts === false && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                Teen accounts stay in <span className="font-semibold">Pending Approval</span> until a parent approves them.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`h-12 rounded-2xl border bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.email ? "border-red-400" : "border-slate-200"}`}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                  maxLength={254}
                />
                {fieldErrors.email && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.email}</p>}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-[#434c9d] hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`h-12 rounded-2xl border bg-slate-50 px-4 pr-11 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.password ? "border-red-400" : "border-slate-200"}`}
                    placeholder="Your password"
                    disabled={isSubmitting}
                    maxLength={128}
                  />
                  <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3.5" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.password}</p>}
              </div>

              <div className="flex items-center gap-2.5">
                <input id="rememberMe" name="rememberMe" type="checkbox" checked={formData.rememberMe} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-300 text-[#434c9d] focus:ring-[#434c9d]/20" disabled={isSubmitting} />
                <label htmlFor="rememberMe" className="select-none text-sm text-slate-600">Remember me</label>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-[#434c9d] font-bold text-white shadow-lg shadow-[#434c9d]/20 transition-all duration-200 hover:bg-[#434c9d]/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || (countdown !== null && countdown > 0)}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : countdown && countdown > 0 ? `Wait ${countdown}s` : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-[#434c9d] hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
