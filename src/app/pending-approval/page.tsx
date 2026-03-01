"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { Clock3, Mail, Phone, Store } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export default function PendingApprovalPage() {
  const { user } = useUser({ redirectOnError: false });

  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      <section className="bg-gradient-to-br from-blue-50 via-orange-50 to-white py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-amber-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="rounded-2xl bg-amber-100 p-3">
                <Clock3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em]">Pending Approval</p>
                <h1 className="mt-1 text-3xl font-bold text-gray-900 md:text-4xl">
                  Your account is waiting for parent approval
                </h1>
              </div>
            </div>

            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              {user?.first_name
                ? `${user.first_name}, your TeenOp account is created, but it cannot go live until your parent or guardian approves it.`
                : "Your TeenOp account is created, but it cannot go live until your parent or guardian approves it."}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-gray-900">What happens next</p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                  <li>We sent an approval request to your parent or guardian contact information.</li>
                  <li>Once they approve your account, your status will switch from Pending Approval to active.</li>
                  <li>You will be able to sign in and continue setting up your TeenOp account.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-gray-900">Parent contact on file</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#434c9d]" /> {user?.parent_email || "Parent email not available"}</p>
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#434c9d]" /> {user?.parent_phone || "Parent phone not available"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-[#434c9d]/30 bg-[#434c9d]/5 p-5">
              <div className="flex items-start gap-3">
                <Store className="mt-0.5 h-5 w-5 text-[#434c9d]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Storefront drafting while you wait</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    You will be able to draft your storefront while waiting for approval. The scaffolding for that flow is in place, but it is still hidden until we turn it on.
                  </p>
                  {FEATURE_FLAGS.enablePendingStorefrontDrafts && (
                    <Button className="mt-4 rounded-xl bg-[#434c9d] text-white hover:bg-[#434c9d]/90">
                      Start Drafting Storefront
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/login">
                <Button variant="outline" className="rounded-xl border-slate-300">
                  Back to Login
                </Button>
              </Link>
              <a href="mailto:teenop.co@gmail.com">
                <Button className="rounded-xl bg-[#434c9d] text-white hover:bg-[#434c9d]/90">
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

