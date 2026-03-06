"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation functions
  const sanitizeInput = (value: string): string => {
    return value.trim().replace(/[<>]/g, '');
  };

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    if (email.length > 254) {
      return "Email address is too long";
    }
    return null;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    setEmail(sanitizedValue);
    const emailErr = validateEmail(sanitizedValue);
    setEmailError(emailErr);
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setEmailError(emailErr);
      setError(emailErr);
      setIsSubmitting(false);
      return;
    }
    
    setEmailError(null);

    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message || "Password reset email sent! Please check your inbox.");
        setEmail("");
      } else {
        setError(result.error || "Failed to send reset email. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            Reset Password
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Enter your email and we&apos;ll send a secure reset link.
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-200/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3]"></div>
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
              <span className="text-sm text-green-800 font-medium block">{success}</span>
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
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full h-13 px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    emailError
                      ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  disabled={isSubmitting}
                  placeholder="you@example.com"
                  maxLength={254}
                />
                {emailError && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {emailError}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-13 bg-gradient-to-r from-[#434c9d] via-[#5a6bc4] to-[#96cbc3] hover:from-[#434c9d]/95 hover:via-[#5a6bc4]/95 hover:to-[#96cbc3]/95 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
            </div>
          </form>

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
