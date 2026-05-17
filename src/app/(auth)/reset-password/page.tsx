"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Eye, EyeOff, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <div className="text-gray-600">Loading…</div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [isReady, setIsReady] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    const markInvalid = () => {
      if (!cancelled) {
        setIsReady(false);
        setLinkError("This reset link is invalid or has expired. Please request a new one.");
      }
    };

    const markReady = () => {
      if (!cancelled) {
        setLinkError("");
        setIsReady(true);
      }
    };

    async function init() {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      const hashType = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (hashError) {
        markInvalid();
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          markInvalid();
        } else {
          markReady();
        }
        return;
      }

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (error) {
          markInvalid();
        } else {
          markReady();
        }
        return;
      }

      if (accessToken && refreshToken && (!hashType || hashType === "recovery")) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          markInvalid();
        } else {
          window.history.replaceState(null, "", window.location.pathname);
          markReady();
        }
        return;
      }

      // The browser client may have already processed the recovery URL before
      // this listener is registered, so check the current session first.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        markReady();
        return;
      }

      // Still no session: set up a listener in case the event fires after mount.
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          markReady();
        }
      });
      sub = data.subscription;

      if (!window.location.hash.includes("access_token")) {
        markInvalid();
      }
    }

    init();

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [searchParams, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message || "Failed to update password. Please try again.");
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex flex-col justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#434c9d]/20 via-[#96cbc3]/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#ff725a]/20 via-[#434c9d]/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
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

        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#434c9d] via-[#96cbc3] to-[#ff725a] bg-clip-text text-transparent mb-4">
            New Password
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            {success ? "Password updated! Redirecting…" : "Choose a strong password for your account."}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-200/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3]"></div>

          {linkError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
              <div className="p-1.5 bg-red-100 rounded-full flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm text-red-800 font-medium block mb-2">{linkError}</span>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#434c9d] hover:underline"
                >
                  Request a new reset link
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1.5 bg-red-100 rounded-full flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-sm text-red-800 font-medium block">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1.5 bg-green-100 rounded-full flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-green-800 font-medium block">
                Password updated successfully! Taking you to sign in…
              </span>
            </div>
          )}

          {!linkError && !success && (
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
                  New password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-13 px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium"
                    placeholder="At least 8 characters"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800">
                  Confirm new password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-13 px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium"
                    placeholder="Repeat your password"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-13 bg-gradient-to-r from-[#434c9d] via-[#5a6bc4] to-[#96cbc3] hover:from-[#434c9d]/95 hover:via-[#5a6bc4]/95 hover:to-[#96cbc3]/95 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !isReady}
                >
                  {!isReady ? "Verifying link…" : isSubmitting ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#434c9d] hover:text-[#434c9d]/80 transition-colors duration-200 hover:underline inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
