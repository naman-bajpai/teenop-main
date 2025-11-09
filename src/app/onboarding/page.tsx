"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  CheckCircle,
  Loader2,
  FileText,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";

function OnboardingContent() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [scheduleUrl, setScheduleUrl] = useState<string | null>(null);
  const [uploadingSchedule, setUploadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [canComplete, setCanComplete] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeSuccess, setStripeSuccess] = useState(false);

  // Check URL parameters for Stripe callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('stripe_error');
    const success = params.get('stripe_success');
    
    if (error) {
      setStripeError(decodeURIComponent(error));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (success === 'true') {
      setStripeSuccess(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Hide success message after 5 seconds
      setTimeout(() => setStripeSuccess(false), 5000);
    }
  }, []);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || userLoading) return;

      // Only teens need onboarding
      if (user.role !== "teen") {
        router.push("/dashboard");
        return;
      }

      // Check if user already has schedule
      const { data: profile } = await supabase
        .from("profiles")
        .select("schedule_url")
        .eq("id", user.id)
        .single();

      if (profile && (profile as any).schedule_url) {
        setScheduleUrl((profile as any).schedule_url);
      }
    };

    checkOnboardingStatus();
  }, [user, userLoading, router, supabase]);

  // Check if requirement is met
  useEffect(() => {
    setCanComplete(!!scheduleUrl);
  }, [scheduleUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setScheduleError(
        "Invalid file type. Please upload PDF, Word document, or image files only."
      );
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setScheduleError("File size exceeds 10MB limit");
      return;
    }

    setScheduleFile(file);
    setScheduleError("");
  };

  const handleScheduleUpload = async () => {
    if (!scheduleFile) return;

    setUploadingSchedule(true);
    setScheduleError("");

    try {
      const formData = new FormData();
      formData.append("file", scheduleFile);

      const response = await fetch("/api/schedule/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload schedule");
      }

      // Update state with the uploaded URL
      setScheduleUrl(result.url);
      setScheduleFile(null);
      
      // Refresh the profile to ensure database is updated
      const { data: profile } = await supabase
        .from("profiles")
        .select("schedule_url")
        .eq("id", user!.id)
        .single();
      
      if (profile && (profile as any).schedule_url) {
        setScheduleUrl((profile as any).schedule_url);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setScheduleError(error.message || "Failed to upload schedule");
    } finally {
      setUploadingSchedule(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete || !scheduleUrl) {
      console.error("Cannot complete: canComplete =", canComplete, "scheduleUrl =", scheduleUrl);
      return;
    }

    try {
      // Verify schedule is in database before redirecting
      const { data: profile } = await supabase
        .from("profiles")
        .select("schedule_url")
        .eq("id", user!.id)
        .single();

      if (!profile || !(profile as any).schedule_url) {
        setScheduleError("Schedule not found. Please try uploading again.");
        return;
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Complete error:", error);
      setScheduleError("Failed to complete setup. Please try again.");
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#96cbc3]/10 via-[#ff725a]/10 to-[#434c9d]/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#434c9d]" />
      </div>
    );
  }

  if (!user || user.role !== "teen") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#96cbc3]/10 via-[#ff725a]/10 to-[#434c9d]/10 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-white/20">
              <div className="p-2 bg-gradient-to-r from-[#ff725a] to-[#434c9d] rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#434c9d] to-[#ff725a] bg-clip-text text-transparent">
                TeenOp
              </span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Setup
          </h1>
          <p className="text-gray-600">
            Upload your schedule to complete your setup
          </p>
        </div>

        {/* Stripe Error Message */}
        {stripeError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Stripe Connection Error</h3>
                <p className="text-sm text-red-700 mb-3">{stripeError}</p>
                {stripeError.includes('expired') || stripeError.includes('invalid') ? (
                  <div className="text-xs text-red-600 space-y-1">
                    <p>• Authorization codes expire quickly. Please try connecting again.</p>
                    <p>• Make sure you complete the Stripe authorization in one session.</p>
                    <p>• If the problem persists, check that your redirect URI matches in Stripe Dashboard.</p>
                  </div>
                ) : null}
                <Button
                  onClick={() => {
                    setStripeError(null);
                    // Redirect to earnings page to try again
                    router.push('/earnings');
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stripe Success Message */}
        {stripeSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="text-sm font-semibold text-green-900">Stripe Account Connected!</h3>
                <p className="text-sm text-green-700">Your payment account has been successfully set up.</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 space-y-6 border border-white/20">
          {/* Schedule Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  scheduleUrl
                    ? "bg-green-100"
                    : "bg-blue-100"
                }`}
              >
                <FileText
                  className={`w-6 h-6 ${
                    scheduleUrl ? "text-green-600" : "text-blue-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  Upload Your Schedule
                </h2>
                <p className="text-sm text-gray-600">
                  Upload a PDF, Word document, or image of your weekly schedule
                </p>
              </div>
              {scheduleUrl && (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Uploaded
                </Badge>
              )}
            </div>

            {scheduleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{scheduleError}</span>
              </div>
            )}

            {scheduleUrl ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 mb-2">
                  Schedule uploaded successfully
                </p>
                <a
                  href={scheduleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline"
                >
                  View uploaded schedule →
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  disabled={uploadingSchedule}
                />
                <Button
                  onClick={handleScheduleUpload}
                  disabled={!scheduleFile || uploadingSchedule}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploadingSchedule ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Schedule
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Complete Button */}
          <div className="pt-6 border-t border-gray-200">
            <Button
              onClick={handleComplete}
              disabled={!canComplete}
              className="w-full bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white font-semibold py-6 text-lg"
            >
              {canComplete ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Setup & Continue
                </>
              ) : (
                "Please complete all steps above"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#96cbc3]/10 via-[#ff725a]/10 to-[#434c9d]/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#434c9d]" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

