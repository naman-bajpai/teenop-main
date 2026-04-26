"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  User,
  CreditCard,
  CalendarCheck,
  Shield,
  Settings,
  Mail,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  {
    icon: Sparkles,
    label: "Getting Started",
    color: "from-[#434c9d] to-[#96cbc3]",
    faqs: [
      {
        q: "What is TeenOp?",
        a: "TeenOp is a neighborhood platform where talented teens offer services — like lawn care, tutoring, pet care, photography, and more — to their local community. It gives teens a safe way to earn money and build real-world skills.",
      },
      {
        q: "Who can sign up?",
        a: "Teens can sign up as service providers. Parents or neighbors can sign up to browse and book services. Teen accounts require parent or guardian contact info during signup.",
      },
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' on the homepage, choose your role (teen or parent/neighbor), fill in your details, and verify your email. Teens will also need a parent or guardian email for approval.",
      },
      {
        q: "Is TeenOp free to join?",
        a: "Yes, creating an account is completely free and no additional fees are added to the price of services.",
      },
    ],
  },
  {
    icon: CalendarCheck,
    label: "Bookings",
    color: "from-[#96cbc3] to-[#434c9d]",
    faqs: [
      {
        q: "How do I book a service?",
        a: "Browse services, click on one you like, and hit 'Book Now'. Choose your preferred date and time, add any special instructions, and confirm. The teen will review and accept or propose an alternative.",
      },
      {
        q: "Can I request a custom quote?",
        a: "Yes. Some services are listed as 'Quote' pricing. You can submit a quote request with your details and the teen will respond with a custom price.",
      },
      {
        q: "How do I cancel a booking?",
        a: "Go to My Bookings, find the booking, and use the cancel option. If a cancellation is needed, please do so at least 24 hours before the scheduled service to ensure a full refund. Last-minute cancellations should be avoided whenever possible.",
      },
      {
        q: "What happens after a booking is completed?",
        a: "After the service is done, you'll be prompted to leave a review and optional tip. The teen's earnings will be credited to their account.",
      },
    ],
  },
  {
    icon: CreditCard,
    label: "Payments",
    color: "from-[#ff725a] to-[#ff8a6b]",
    faqs: [
      {
        q: "How does payment work?",
        a: "Payments are processed securely through Stripe. You pay when confirming a booking, and the teen receives their earnings once the service is completed.",
      },
      {
        q: "How do teens get paid?",
        a: "Teens need to connect a Stripe account under their Bookings Page. Once connected, earnings from completed bookings are transferred to their bank account after they select the \"Withdraw Cash\" button on their Earnings Page.",
      },
      {
        q: "Can I leave a tip?",
        a: "Yes! After a completed booking you can add a tip to show appreciation. Tips go directly to the teen.",
      },
      {
        q: "What is the refund policy?",
        a: "If a cancellation is needed, please do so at least 24 hours before the scheduled service to ensure a full refund. If the teen provider cancels, the buyer will receive an automatic full refund, typically processed within 5 business days. Last-minute cancellations should be avoided whenever possible.",
      },
    ],
  },
  {
    icon: User,
    label: "Profile & Account",
    color: "from-[#434c9d] to-[#ff725a]",
    faqs: [
      {
        q: "How do I update my profile?",
        a: "Go to Profile in your dashboard. You can update your name, bio, avatar, and skills from there.",
      },
      {
        q: "How do I change my password?",
        a: "Go to Settings or use the 'Forgot Password' link on the login page to reset your password via email.",
      },
      {
        q: "Can I have both a teen and parent account?",
        a: "Each email address is tied to one account type. If you need a different role, you'll need to use a separate email address.",
      },
      {
        q: "How do I delete my account?",
        a: "Contact us at teenop.co@gmail.com and we'll process your account deletion request promptly.",
      },
    ],
  },
  {
    icon: Shield,
    label: "Safety",
    color: "from-[#96cbc3] to-[#ff725a]",
    faqs: [
      {
        q: "Is it safe for my teen to use TeenOp?",
        a: "TeenOp is built with teen safety in mind. We collect parent or guardian contact info, keep communication on-platform, and have rules against sharing personal contact details publicly.",
      },
      {
        q: "What should I do if I feel unsafe?",
        a: "Stop the interaction immediately. If there is immediate danger, call emergency services. For platform concerns, contact us at teenop.co@gmail.com as soon as possible.",
      },
      {
        q: "Are users verified?",
        a: "Accounts go through an email verification step. Teen accounts also require parent or guardian contact. Always use the platform messaging system and meet in public when possible.",
      },
    ],
  },
  {
    icon: Settings,
    label: "Technical Issues",
    color: "from-[#434c9d] to-[#96cbc3]",
    faqs: [
      {
        q: "The page isn't loading correctly. What should I do?",
        a: "Try refreshing the page or clearing your browser cache. If the issue persists, try a different browser or device and contact us if it continues.",
      },
      {
        q: "I didn't receive my verification email.",
        a: "Check your spam or junk folder first. If it's not there, try signing up again or contact us at teenop.co@gmail.com.",
      },
      {
        q: "My payment didn't go through. What now?",
        a: "Double-check your card details and billing address. If everything looks correct and it still fails, contact your bank or reach out to us for help.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-base font-semibold text-gray-900">{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-slate-600">{a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      {/* Hero */}
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

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#434c9d] to-[#96cbc3] shadow-lg">
              <HelpCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="page-title text-gray-900">Help Center</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Find answers to common questions about TeenOp.
              </p>
            </div>
          </div>

          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Whether you&apos;re a teen looking to earn, a parent setting up an
            account, or a neighbor booking a service — we&apos;ve got answers
            for you below.
          </p>
        </div>
      </section>

      {/* FAQ Body */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">

            {/* Sidebar nav */}
            <aside className="shrink-0 lg:w-52">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Categories
              </p>
              <nav className="flex flex-row flex-wrap gap-2 lg:flex-col">
                {categories.map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => setActiveCategory(i)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                        activeCategory === i
                          ? "bg-[#434c9d] text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {cat.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* FAQ cards */}
            <div className="flex-1">
              {categories.map((cat, i) => {
                const Icon = cat.icon;
                if (i !== activeCategory) return null;
                return (
                  <div key={cat.label}>
                    <div className="mb-6 flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow",
                          cat.color
                        )}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {cat.label}
                      </h2>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white px-6 shadow-sm">
                      {cat.faqs.map((faq) => (
                        <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Still need help */}
          <div className="mt-16 rounded-2xl border border-[#96cbc3]/30 bg-[#434c9d]/5 p-8">
            <div className="mb-4 flex items-center gap-3 text-[#434c9d]">
              <Mail className="h-5 w-5" />
              <h2 className="text-2xl font-bold text-gray-900">
                Still need help?
              </h2>
            </div>
            <p className="mb-2 text-base leading-relaxed text-slate-600">
              Can&apos;t find what you&apos;re looking for? Reach out and
              we&apos;ll get back to you as soon as possible.
            </p>
            <p>
              Email:{" "}
              <a
                href="mailto:teenop.co@gmail.com"
                className="font-semibold text-[#434c9d] transition-colors hover:text-[#96cbc3]"
              >
                teenop.co@gmail.com
              </a>
            </p>
          </div>

          {/* Quick links */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { href: "/safety", icon: Shield, label: "Safety Guide", desc: "How we protect our community" },
              { href: "/our-story", icon: BookOpen, label: "Our Story", desc: "Learn what TeenOp is about" },
              { href: "/services", icon: Sparkles, label: "Browse Services", desc: "See what teens are offering" },
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#434c9d]/10">
                  <Icon className="h-5 w-5 text-[#434c9d]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
