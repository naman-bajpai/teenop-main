"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, User, Mail } from "lucide-react";

type ChildInfo = {
  first_name: string;
  last_name: string;
  email: string;
  age: number | null;
};

export default function ParentVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50">
          <div className="text-gray-600 font-medium">Loading…</div>
        </div>
      }
    >
      <ParentVerifyInner />
    </Suspense>
  );
}

function ParentVerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [child, setChild] = useState<ChildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ChildInfo>({
    first_name: "",
    last_name: "",
    email: "",
    age: null,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    first_name?: string;
    last_name?: string;
    age?: string;
  }>({});

  useEffect(() => {
    if (!token?.trim()) {
      setError("Missing verification link. Please use the link from the email we sent you.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/parent-verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "This link is invalid or has expired.");
          setLoading(false);
          return;
        }
        const childInfo = data.child as ChildInfo;
        setChild(childInfo);
        setFormData({
          first_name: childInfo.first_name,
          last_name: childInfo.last_name,
          email: childInfo.email,
          age: childInfo.age,
        });
      } catch {
        if (!cancelled) {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};
    if (!formData.first_name?.trim()) errs.first_name = "First name is required.";
    if (!formData.last_name?.trim()) errs.last_name = "Last name is required.";
    if (formData.age != null) {
      const a = Number(formData.age);
      if (a < 13 || a > 19) errs.age = "Age must be between 13 and 19.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token?.trim()) return;
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/parent-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          first_name: formData.first_name?.trim(),
          last_name: formData.last_name?.trim(),
          age:
            formData.age !== undefined &&
            formData.age !== null &&
            String(formData.age).trim() !== ""
              ? Number(formData.age)
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#434c9d]/30 border-t-[#434c9d] rounded-full animate-spin" />
          <span className="text-gray-600 font-medium">Loading verification…</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 flex flex-col justify-center py-12 px-4">
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-white/40">
              <Image src="/images/newlogo.png" alt="TeenOp" width={200} height={200} className="h-16 w-16" />
            </Link>
          </div>
          <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-200/50 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Account verified</h1>
            <p className="text-gray-600 mb-8">
              Your child&apos;s TeenOp account is now active. They can log in with their email and password.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3] px-6 py-3 text-white font-semibold hover:opacity-95 transition-opacity"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !child) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 flex flex-col justify-center py-12 px-4">
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-white/40">
              <Image src="/images/newlogo.png" alt="TeenOp" width={200} height={200} className="h-16 w-16" />
            </Link>
          </div>
          <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-200/50">
            <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <Link href="/" className="text-[#434c9d] font-semibold hover:underline">
              Return to TeenOp
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 flex flex-col justify-center py-12 px-4 sm:py-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#434c9d]/20 via-[#ff725a]/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#96cbc3]/20 via-[#434c9d]/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-white/40 hover:bg-white transition-all">
            <Image src="/images/newlogo.png" alt="TeenOp" width={200} height={200} className="h-16 w-16" />
          </Link>
        </div>

        <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-200/50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
              Verify your child&apos;s account
            </h1>
            <p className="mt-2 text-gray-600">
              Review the information below and confirm to activate their TeenOp account. You can update their details if needed.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-5 bg-gradient-to-br from-[#96cbc3]/10 to-[#434c9d]/10 rounded-xl border-2 border-[#96cbc3]/30">
              <h2 className="text-sm font-bold text-[#434c9d] mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Your child&apos;s information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="first_name" className="block text-sm font-semibold text-gray-800">
                    First name
                  </label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData((p) => ({ ...p, first_name: e.target.value }))}
                    className={`w-full h-12 px-4 rounded-xl border-2 ${
                      fieldErrors.first_name ? "border-red-400" : "border-gray-200"
                    }`}
                    placeholder="First name"
                  />
                  {fieldErrors.first_name && (
                    <p className="text-xs text-red-600">{fieldErrors.first_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="last_name" className="block text-sm font-semibold text-gray-800">
                    Last name
                  </label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))}
                    className={`w-full h-12 px-4 rounded-xl border-2 ${
                      fieldErrors.last_name ? "border-red-400" : "border-gray-200"
                    }`}
                    placeholder="Last name"
                  />
                  {fieldErrors.last_name && (
                    <p className="text-xs text-red-600">{fieldErrors.last_name}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800">
                  Email (login)
                </label>
                <div className="flex items-center gap-2 h-12 px-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{formData.email}</span>
                </div>
                <p className="text-xs text-gray-500">Email cannot be changed here.</p>
              </div>
              <div className="mt-4 space-y-2">
                <label htmlFor="age" className="block text-sm font-semibold text-gray-800">
                  Age
                </label>
                <Input
                  id="age"
                  type="number"
                  min={13}
                  max={19}
                  value={formData.age ?? ""}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      age: e.target.value === "" ? null : parseInt(e.target.value, 10) || null,
                    }))
                  }
                  className={`w-full max-w-[100px] h-12 px-4 rounded-xl border-2 ${
                    fieldErrors.age ? "border-red-400" : "border-gray-200"
                  }`}
                  placeholder="13–19"
                />
                {fieldErrors.age && <p className="text-xs text-red-600">{fieldErrors.age}</p>}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3] hover:opacity-95 text-white font-bold rounded-xl"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming…
                </span>
              ) : (
                "Confirm and activate my child's account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            By confirming, you approve this TeenOp account for your child. They will be able to log in and use the platform.
          </p>
        </div>

        <p className="mt-6 text-center">
          <Link href="/" className="text-[#434c9d] font-semibold hover:underline">
            Back to TeenOp
          </Link>
        </p>
      </div>
    </div>
  );
}
