"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Loader2,
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
    if (!user || userLoading) return;

    // Only teens need onboarding
    if (user.role !== "teen") {
      router.push("/dashboard");
      return;
    }
  }, [user, userLoading, router]);

  // Check if requirement is met - schedule is now optional
  useEffect(() => {
    setCanComplete(true); // Always allow completion, schedule is optional
  }, []);

  const handleComplete = async () => {
    if (!canComplete) {
      console.error("Cannot complete: canComplete =", canComplete);
      return;
    }

    try {
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Complete error:", error);
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
            You're all set! Continue to your dashboard to get started.
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
          {/* Complete Button */}
          <div className="pt-6">
            <Button
              onClick={handleComplete}
              disabled={!canComplete}
              className="w-full bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white font-semibold py-6 text-lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete Setup & Continue
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

