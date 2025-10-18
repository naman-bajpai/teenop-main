import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Star, TrendingUp } from "lucide-react";

interface User { id: string; name?: string; email?: string; }
interface HeroSectionProps { user: User | null; }

export default function HeroSection({ user }: HeroSectionProps) {
  return (
    <section id="hero" className="relative overflow-hidden bg-slate-950 -mt-17 pt-17">
      {/* Background image */}
      <div className="absolute inset-0">
        <div
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/dog.png')" }}
          aria-hidden
        />
        {/* Brand color overlay + vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#434c9d]/30 via-[#434c9d]/20 to-slate-950/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,.25),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 text-center md:py-28">

        <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-extrabold tracking-tight text-white drop-shadow md:text-6xl lg:text-7xl">
          {user ? `Welcome back!` : "Find Help in Your Neighborhood"}
        </h1>

        <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-white/90 md:text-2xl">
          {user
            ? "Ready to discover services by teens near you or start your own teen hustle?"
            : "Hire motivated teens for pet care, lawn services and more - right in your neighborhood"}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/services">
            <Button className="h-auto px-6 py-3 text-lg bg-white text-[#434c9d] hover:bg-slate-100 shadow-md focus-visible:ring-2 focus-visible:ring-[#96cbc3]">
              <Users className="mr-2 h-5 w-5" aria-hidden />
              Browse Services
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="h-auto px-6 py-3 text-lg bg-[#ff725a] text-white hover:bg-[#ff725a]/90 shadow-md focus-visible:ring-2 focus-visible:ring-white/60">
              <TrendingUp className="mr-2 h-5 w-5" aria-hidden />
              Start Earning
            </Button>
          </Link>
        </div>

        {/* Highlights */}
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-6 text-white backdrop-blur-md ring-1 ring-white/15 shadow-md">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#96cbc3]/20">
              <Users className="h-7 w-7 text-[#96cbc3]" aria-hidden />
            </div>
            <h3 className="mb-1 font-semibold">Trusted Teens</h3>
            <p className="text-sm text-white/85">Verified young entrepreneurs in your community</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 text-white backdrop-blur-md ring-1 ring-white/15 shadow-md">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-300/20">
              <Star className="h-7 w-7 text-amber-200" aria-hidden />
            </div>
            <h3 className="mb-1 font-semibold">Quality Service</h3>
            <p className="text-sm text-white/85">Rated and reviewed by real customers</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 text-white backdrop-blur-md ring-1 ring-white/15 shadow-md">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#96cbc3]/20">
              <TrendingUp className="h-7 w-7 text-[#96cbc3]" aria-hidden />
            </div>
            <h3 className="mb-1 font-semibold">Fair Prices</h3>
            <p className="text-sm text-white/85">Affordable rates that work for everyone</p>
          </div>
        </div>
      </div>
    </section>
  );
}
