"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Eye, EyeOff, AlertCircle, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminLoginPage() {
  const router = useRouter();
  
  // Clear any URL parameters on mount for security
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      // Remove query parameters from URL without reload
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, []);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

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
    const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
    return timeSinceLastAttempt < waitTime;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we should wait before retrying
    if (shouldWaitForRetry()) {
      const timeSinceLastAttempt = Date.now() - (lastAttemptTime || 0);
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
      const remainingTime = Math.ceil((waitTime - timeSinceLastAttempt) / 1000);
      setCountdown(remainingTime);
      setError(`Please wait ${remainingTime} seconds before trying again.`);
      return;
    }

    // Validate form data
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setLastAttemptTime(Date.now());

    try {
      const supabase = createClient();
      console.log("Admin login attempt for:", formData.email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error("Admin login error:", error);
        
        // Handle rate limiting specifically
        if (error.message?.includes("rate limit")) {
          setRetryCount(prev => prev + 1);
          const waitTime = Math.min(1000 * Math.pow(2, retryCount + 1), 30000);
          const remainingTime = Math.ceil(waitTime / 1000);
          setCountdown(remainingTime);
          setError("Too many login attempts. Please wait a moment and try again.");
          return;
        }
        
        setRetryCount(0);
        setError("Invalid admin credentials. Please check your email and password.");
        return;
      }

      // Reset retry count on successful login
      setRetryCount(0);

      if (data.user) {
        console.log("Admin user authenticated:", data.user.id);

        // Check if user is actually an admin
        // Users should be able to view their own profile via RLS policy
        let profile: any = null;
        let profileError: any = null;
        
        // First try: Query by user ID (should work with "Users can view their own profile" policy)
        const { data: profileById, error: errorById } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (errorById || !profileById) {
          console.error("Profile lookup by ID failed:", errorById);
          
          // Second try: Query by email (in case there's a policy allowing this)
          const { data: profileByEmail, error: errorByEmail } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", data.user.email || formData.email)
            .single();
          
          if (errorByEmail || !profileByEmail) {
            console.error("Profile lookup by email also failed:", errorByEmail);
            
            // Show detailed error for debugging
            const errorMessage = errorById?.message || errorByEmail?.message || "Unknown error";
            const errorCode = errorById?.code || errorByEmail?.code || "Unknown";
            
            console.error("Full error details:", {
              errorById: errorById,
              errorByEmail: errorByEmail,
              userId: data.user.id,
              userEmail: data.user.email
            });
            
            setError(
              `Unable to verify admin status. Error: ${errorMessage} (Code: ${errorCode}). ` +
              `Please ensure you have a profile with role='admin' and that RLS policies allow users to view their own profile.`
            );
            setIsSubmitting(false);
            return;
          }
          
          profile = profileByEmail;
        } else {
          profile = profileById;
        }

        if (!profile) {
          console.error("Profile is null after all attempts");
          setError("Admin profile not found. Please ensure your profile exists and has role='admin'.");
          setIsSubmitting(false);
          return;
        }

        console.log("Profile found:", { id: profile.id, email: profile.email, role: profile.role });

        // Verify admin role
        if (profile.role !== "admin") {
          console.error("User is not an admin:", { role: profile.role, email: profile.email });
          setError(`Access denied. Your account role is '${profile.role}', but 'admin' is required.`);
          setIsSubmitting(false);
          return;
        }

        if (data.session) {
          await supabase.auth.setSession(data.session);
          console.log("Admin session persisted successfully");
        }

        console.log("Admin login successful, redirecting to admin dashboard");
        // Clear any URL parameters before redirecting
        const cleanUrl = "/admin/dashboard";
        // Use router.push for client-side navigation (cleaner)
        router.push(cleanUrl);
        // Fallback to window.location if router doesn't work
        setTimeout(() => {
          if (window.location.pathname !== "/admin/dashboard") {
            window.location.href = cleanUrl;
          }
        }, 100);
      } else {
        setError("Login failed. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Admin login exception:", err);
      setRetryCount(prev => prev + 1);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col justify-center min-h-[calc(100vh-200px)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-slate-900 rounded-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-sm text-gray-500">Sign in to access the admin portal</p>
          </div>

          <div className="bg-white py-8 px-6 shadow-sm sm:rounded-lg sm:px-8 border border-gray-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">{error}</p>
                {countdown && countdown > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    Retry available in {countdown} second{countdown !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} method="post" className="space-y-5" action="#">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-11 pl-10 pr-4 border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                  placeholder="admin@example.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-11 pl-10 pr-12 border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || (countdown !== null && countdown > 0)}  
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : countdown && countdown > 0 ? (
                  `Wait ${countdown}s`
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Back to main site link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to TeenOps
          </Link>
        </div>
        </div>
      </div>
    </AdminLayout>
  );
}
