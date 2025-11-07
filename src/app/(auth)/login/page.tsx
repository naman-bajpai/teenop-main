"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent rapid-fire submissions
    if (submitLock || isSubmitting) {
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
          return;
        }

        if (data.session) {
          await supabase.auth.setSession(data.session);
          console.log("Session persisted successfully");
        }

        console.log("Login successful, redirecting to:", redirectTo);
        router.push(redirectTo);
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
    <div className="min-h-screen bg-gradient-to-br from-[#96cbc3]/10 via-[#23a699]/10 to-[#434c9d]/10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#ff725a]/20 to-[#434c9d]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#23a699]/20 to-[#96cbc3]/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <Link
            href="/"
            className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-white/20 hover:bg-white/90 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="p-2 bg-gradient-to-r from-[#ff725a] to-[#434c9d] rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#434c9d] to-[#ff725a] bg-clip-text text-transparent">
              TeenOp
            </span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome back!</h1>
          <p className="text-lg text-gray-600">Sign in to continue your teen hustle journey</p>
        </div>
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/20">
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1 bg-red-100 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <span className="text-sm text-red-700 font-medium">{error}</span>
                {countdown && countdown > 0 && (
                  <div className="mt-1 text-xs text-red-600">
                    Retry available in {countdown} second{countdown !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d] focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                  placeholder="Enter your email"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 pr-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d] focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-xl transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#434c9d] focus:ring-[#434c9d] border-gray-300 rounded transition-colors duration-200"
                  disabled={isSubmitting}
                />
                <label htmlFor="rememberMe" className="ml-3 block text-sm font-medium text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-semibold text-[#434c9d] hover:text-[#434c9d]/80 transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50"
                disabled={isSubmitting || (countdown !== null && countdown > 0)}  
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : countdown && countdown > 0 ? (
                  `Wait ${countdown}s`
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Sign up link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[#434c9d] hover:text-[#434c9d]/80 transition-colors duration-200"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
