"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");

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
    
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setRateLimitMessage(
          typeof result.error === "string"
            ? result.error
            : "Too many sign-in attempts. Please wait and try again."
        );
        setRateLimitOpen(true);
        return;
      }

      if (!res.ok) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Invalid admin credentials. Please check your email and password."
        );
        return;
      }

      const profile = result.user;
      const supabase = createClient();

      if (!profile) {
        setError("Admin profile not found. Please ensure your profile exists and has role='admin'.");
        return;
      }

      if (profile.role !== "admin") {
        setError(
          `Access denied. Your account role is '${profile.role}', but 'admin' is required.`
        );
        await supabase.auth.signOut();
        return;
      }

      if (result.session) {
        await supabase.auth.setSession(result.session);
      }

      const cleanUrl = "/admin/dashboard";
      router.push(cleanUrl);
      setTimeout(() => {
        if (window.location.pathname !== "/admin/dashboard") {
          window.location.href = cleanUrl;
        }
      }, 100);
    } catch {
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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
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

      <Dialog open={rateLimitOpen} onOpenChange={setRateLimitOpen}>
        <DialogContent className="rounded-xl sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Too many sign-in attempts</DialogTitle>
            <DialogDescription className="text-left text-base text-gray-600">
              {rateLimitMessage ||
                "You have exceeded the allowed number of tries. Please wait before trying again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800"
              onClick={() => setRateLimitOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
