"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex flex-col justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#434c9d]/20 via-[#96cbc3]/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#ff725a]/20 via-[#434c9d]/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#96cbc3]/10 via-[#434c9d]/10 to-[#ff725a]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link
            href="/"
            className="group flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-white/40 hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
          >
            <Image
              src="/images/newlogo.png"
              alt="TeenOp Logo"
              width={200}
              height={200}
              className="h-16 w-16 transition-transform duration-300 group-hover:scale-110"
            />
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#434c9d] via-[#96cbc3] to-[#ff725a] bg-clip-text text-transparent mb-4">
            Welcome back!
          </h1>
          <p className="text-xl text-gray-600 font-medium">Sign in to continue your teen hustle journey</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-200/50 relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3]"></div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1.5 bg-red-100 rounded-full flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-red-800 font-medium block">{error}</span>
                {countdown && countdown > 0 && (
                  <div className="mt-1.5 text-xs text-red-600">
                    Retry available in {countdown} second{countdown !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800">
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
                  className={`w-full h-13 px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.email ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                  maxLength={254}
                />
                {fieldErrors.email && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
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
                  className={`w-full h-13 px-4 py-3 pr-12 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.password ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100/50 rounded-r-xl transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
                {fieldErrors.password && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center group">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 border-gray-300 rounded cursor-pointer transition-all duration-200"
                  disabled={isSubmitting}
                />
                <label htmlFor="rememberMe" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer group-hover:text-gray-900 transition-colors">
                  Remember me
                </label>
              </div>

              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-[#434c9d] hover:text-[#434c9d]/80 transition-colors duration-200 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-13 bg-gradient-to-r from-[#434c9d] via-[#5a6bc4] to-[#96cbc3] hover:from-[#434c9d]/95 hover:via-[#5a6bc4]/95 hover:to-[#96cbc3]/95 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                disabled={isSubmitting || (countdown !== null && countdown > 0)}  
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : countdown && countdown > 0 ? (
                    `Wait ${countdown}s`
                  ) : (
                    "Sign in"
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Button>
            </div>
          </form>
        </div>

        {/* Sign up link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-base">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/signup"
              className="font-bold text-[#434c9d] hover:text-[#434c9d]/80 transition-colors duration-200 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
