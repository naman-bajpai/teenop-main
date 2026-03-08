"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { ArrowLeft, Shield, Lock, MessageCircle, CheckCircle2, LifeBuoy } from "lucide-react";

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      <section className="bg-gradient-to-br from-blue-50 via-orange-50 to-white py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="mb-8 text-[#434c9d] hover:bg-[#96cbc3]/20 hover:text-[#434c9d]/80"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#434c9d] to-[#96cbc3] shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="page-title text-gray-900">
                Safety
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500">
                How TeenOp helps protect teens, families, and neighbors.
              </p>
            </div>
          </div>

          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            TeenOp is built to help local communities connect in a safer, more structured way. While no marketplace can remove all risk, we design the platform to reduce unnecessary exposure, support accountability, and give users practical tools for safer interactions.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-[#434c9d]">
              <Shield className="h-5 w-5" />
              <h2 className="text-2xl font-bold text-gray-900">Protected Community</h2>
            </div>
            <div className="space-y-3 text-base leading-relaxed text-slate-600">
              <p>TeenOp is designed specifically to connect teen service providers with community members in a neighborhood-based setting, not a broad anonymous marketplace.</p>
              <p>Teen accounts include parent or guardian contact collection during signup, and communication happens through the platform rather than through immediately exposed personal contact details.</p>
              <p>Platform rules prohibit harassment, off-platform circumvention, and inappropriate contact-sharing, and accounts may be restricted or removed when they create safety concerns.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-[#434c9d]">
              <Lock className="h-5 w-5" />
              <h2 className="text-2xl font-bold text-gray-900">Privacy Protection</h2>
            </div>
            <div className="space-y-3 text-base leading-relaxed text-slate-600">
              <p>TeenOp does not display personal phone numbers or personal email addresses on the platform for routine communication between users.</p>
              <p>Physical addresses are not shared by default and should only be shared when a booking truly requires a service at a home or specific location.</p>
              <p>Payments are processed through Stripe, and TeenOp does not store full payment card or bank account details.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-[#434c9d]">
              <MessageCircle className="h-5 w-5" />
              <h2 className="text-2xl font-bold text-gray-900">How to Stay Safe</h2>
            </div>
            <ul className="list-disc space-y-3 pl-6 text-base leading-relaxed text-slate-600">
              <li>Keep communication inside TeenOp so there is a clear record of what was discussed.</li>
              <li>Meet in public locations whenever possible, especially for first-time interactions.</li>
              <li>Do not share unnecessary private information before a booking is confirmed.</li>
              <li>Review service details, pricing, and timing carefully before paying or accepting a job.</li>
              <li>Parents or guardians should stay involved when a teen is providing in-person services.</li>
              <li>Leave reviews after completed jobs so the community has better visibility into reliable experiences.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-[#434c9d]">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-2xl font-bold text-gray-900">Accountability</h2>
            </div>
            <div className="space-y-3 text-base leading-relaxed text-slate-600">
              <p>TeenOp supports accountability through platform messaging, booking records, payment history, and post-service reviews.</p>
              <p>Messages may be monitored or reviewed for safety, policy compliance, and community standards, and misuse of the platform may result in suspension or removal.</p>
              <p>If something feels wrong, users should stop the interaction, avoid continuing off-platform, and contact TeenOp so concerns can be documented and reviewed.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#96cbc3]/30 bg-[#434c9d]/5 p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-[#434c9d]">
              <LifeBuoy className="h-5 w-5" />
              <h2 className="text-2xl font-bold text-gray-900">Contact for Support</h2>
            </div>
            <div className="space-y-3 text-base leading-relaxed text-slate-600">
              <p>If you have a safety concern, suspicious interaction, or need help with a situation on TeenOp, contact us as soon as possible.</p>
              <p>
                Email:{" "}
                <a href="mailto:teenop.co@gmail.com" className="font-semibold text-[#434c9d] hover:text-[#96cbc3] transition-colors">
                  teenop.co@gmail.com
                </a>
              </p>
              <p>For urgent or immediate danger, contact local law enforcement or emergency services first.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
