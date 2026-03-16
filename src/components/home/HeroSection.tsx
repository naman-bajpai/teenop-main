import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import Image from "next/image";

interface User { id: string; name?: string; email?: string; role?: string; }
interface HeroSectionProps { user: User | null | undefined; }

export default function HeroSection({ user: _user }: HeroSectionProps) {
  return (
    <section id="hero" className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-950 -mt-17 pt-17">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/dog.png')" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#434c9d]/30 via-[#434c9d]/20 to-slate-950/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,.25),transparent_60%)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Logo + Tagline + Buttons */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <Image
              src="/images/newlogo.png"
              alt="TeenOp Logo"
              width={320}
              height={320}
              className="w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60 drop-shadow-2xl -mt-10"
            />

            <p className="text-xl sm:text-2xl md:text-3xl text-white/90 font-medium max-w-xs leading-relaxed backdrop-blur-md bg-white/10 px-6 py-4 rounded-2xl ring-1 ring-white/20">
              Talented teens offering services to their community
            </p>

            <div className="flex flex-col gap-4 pt-2 w-full max-w-xs">
              <Link href="/services" className="w-full">
                <Button
                  size="lg"
                  className="group relative w-full h-14 px-8 text-base bg-white text-[#434c9d] hover:bg-white/95 shadow-2xl hover:scale-105 transition-all duration-300 rounded-xl font-semibold overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Browse Services
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#96cbc3]/0 via-[#96cbc3]/10 to-[#96cbc3]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </Link>

              <Link href="/signup" className="w-full">
                <Button
                  size="lg"
                  className="group relative w-full h-14 px-8 text-base bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] hover:from-[#ff725a]/90 hover:to-[#ff8a6b]/90 text-white shadow-2xl hover:scale-105 transition-all duration-300 rounded-xl font-semibold overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Offer Services
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: TeenOp Definition Box */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-[28px] bg-white px-8 py-8 text-left shadow-2xl ring-1 ring-black/5">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#434c9d]/50">TeenOp</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-2xl font-bold text-slate-900">teen·op</p>
                <p className="text-sm italic text-slate-400">| ˈten-ˌap | noun</p>
              </div>
              <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
                A neighborhood platform where talented teens offer services to local community members, making it easier to hire help close to home while creating real work opportunities for young people.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
