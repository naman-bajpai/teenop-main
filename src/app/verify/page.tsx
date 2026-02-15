"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

/**
 * Redirect /verify?token=... to /parent/verify?token=...
 * So email links that point to /verify still work.
 */
function VerifyRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    const target = token
      ? `/parent/verify?token=${encodeURIComponent(token)}`
      : "/parent/verify";
    router.replace(target);
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50">
      <div className="text-gray-600 font-medium">Redirecting…</div>
    </div>
  );
}

export default function VerifyRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50">
          <div className="text-gray-600 font-medium">Loading…</div>
        </div>
      }
    >
      <VerifyRedirectInner />
    </Suspense>
  );
}
