import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Star, TrendingUp } from "lucide-react";

interface User { id: string; name?: string; email?: string; role?: string; }
interface HeroSectionProps { user: User | null | undefined; }

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
          {user ? `Welcome to TeenOp` : "Find Help in Your Neighborhood"}
        </h1>

        <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-white md:text-2xl font-semibold drop-shadow-lg bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg">
          {user
            ? "Ready to discover services by teens near you or start your own teen hustle?"
            : "Connecting teen businesses to their community."}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/neighborhood">
            <Button className="group relative h-auto px-8 py-6 text-lg bg-white text-[#434c9d] hover:bg-white/95 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden font-semibold">
              <span className="relative z-10 flex items-center gap-2">
                <Users className="w-5 h-5 group-hover:scale-110 transition-transform" aria-hidden />
                Browse Services
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#96cbc3]/0 via-[#96cbc3]/5 to-[#96cbc3]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </Button>
          </Link>
          {user && user.role === "teen" && (
            <Link href="/my-teen-hustle">
              <Button className="group relative h-auto px-8 py-6 text-lg bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] hover:from-[#ff725a]/90 hover:to-[#ff8a6b]/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden font-semibold">
                <span className="relative z-10 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" aria-hidden />
                  Start Earning
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Button>
            </Link>
          )}
        </div>

        {/* Highlights */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="group relative rounded-3xl bg-white/10 p-8 text-white backdrop-blur-md ring-2 ring-white/20 shadow-xl hover:shadow-2xl hover:ring-white/30 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#96cbc3]/30 to-[#434c9d]/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-[#96cbc3]" aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-bold">Trusted Teens</h3>
              <p className="text-sm text-white/90 leading-relaxed">Verified young entrepreneurs in your community</p>
            </div>
          </div>
          <div className="group relative rounded-3xl bg-white/10 p-8 text-white backdrop-blur-md ring-2 ring-white/20 shadow-xl hover:shadow-2xl hover:ring-white/30 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-500/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Star className="h-8 w-8 text-amber-300" aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-bold">Quality Service</h3>
              <p className="text-sm text-white/90 leading-relaxed">Rated and reviewed by real customers</p>
            </div>
          </div>
          <div className="group relative rounded-3xl bg-white/10 p-8 text-white backdrop-blur-md ring-2 ring-white/20 shadow-xl hover:shadow-2xl hover:ring-white/30 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#96cbc3]/30 to-[#434c9d]/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-[#96cbc3]" aria-hidden />
              </div>
              <h3 className="mb-2 text-lg font-bold">Fair Prices</h3>
              <p className="text-sm text-white/90 leading-relaxed">Affordable rates that work for everyone</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
