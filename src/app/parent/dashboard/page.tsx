"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export default function ParentDashboardPage() {
  if (!FEATURE_FLAGS.enableParentDashboardAccess) {
    return (
      <div className="min-h-screen bg-white text-gray-700">
        <Navbar />
        <section className="py-24">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h1 className="page-title text-gray-900">Parent Dashboard</h1>
            <p className="mt-4 text-lg text-slate-600">
              Parent dashboard access scaffolding exists, but the feature is currently hidden.
            </p>
            <Link href="/">
              <Button className="mt-8 rounded-xl bg-[#434c9d] text-white hover:bg-[#434c9d]/90">
                Return Home
              </Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="page-title text-gray-900">Parent Dashboard</h1>
          <p className="mt-4 text-lg text-slate-600">
            Hidden parent access to teen account and bookings will be surfaced here when the feature is enabled.
          </p>
        </div>
      </section>
    </div>
  );
}
