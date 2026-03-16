import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import Image from "next/image";

interface User { id: string; name?: string; email?: string; role?: string; }
interface HeroSectionProps { user: User | null | undefined; }

export default function HeroSection({ user: _user }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col overflow-hidden -mt-17 pt-17"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <div
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/dog.png')" }}
          aria-hidden
        />
      </div>

      {/* Content wrapper — full height, flex column */}
      <div className="relative z-10 flex flex-col min-h-[calc(100vh-68px)] w-full">

        {/* Top-left: Logo + Tagline + Buttons */}
        <div className="flex flex-col items-start px-8 sm:px-12 lg:px-16 pt-10 lg:pt-14 max-w-xl">

          {/* Logo */}
          <Image
            src="/images/newlogo copy.png"
            alt="TeenOp Logo"
            width={4412}
            height={943}
            className="w-[220px] sm:w-[300px] lg:w-[400px] h-auto"
          />

          {/* Tagline */}
          <p className="mt-5 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight max-w-xs lg:max-w-sm">
            Talented teens offering services to their community
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 mt-8 w-[220px] sm:w-[260px]">
            {/* Browse Services — white/outlined */}
            <Link href="/services" className="w-full">
              <Button
                size="lg"
                className="group w-full h-13 px-6 text-sm font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Browse Services
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-auto" />
                </span>
              </Button>
            </Link>

            {/* Offer Services — coral filled */}
            <Link href="/signup" className="w-full">
              <Button
                size="lg"
                className="group w-full h-13 px-6 text-sm font-bold bg-[#E8634A] hover:bg-[#d45539] text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Offer Services
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-auto" />
                </span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Spacer pushes card to bottom */}
        <div className="flex-1" />

        {/* Bottom-right: Definition Card */}
        <div className="flex justify-end px-8 sm:px-12 lg:px-16 pb-10 lg:pb-14">
          <div className="w-full max-w-sm rounded-3xl bg-white/90 backdrop-blur-md px-7 py-6 shadow-2xl ring-1 ring-black/5">
            {/* Card header */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-black text-slate-900 tracking-tight">teen-op</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">[teen opportunity]</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400 italic">noun.</p>
            </div>

            {/* Services list */}
            <div className="mt-4">
              <p className="text-[10px] font-black text-[#E8634A] uppercase tracking-[0.15em] mb-3">
                Services by teens
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  "Dog walking",
                  "Kids sports training",
                  "Lawn care",
                  "Senior/family photography",
                  "Furniture moving/assembly",
                  "Kids party assistant",
                  "Car washing/detailing",
                  "Graphic & web design",
                  "Social media creation",
                  "Event setup/cleanup",
                ].map((service) => (
                  <li key={service} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8634A] shrink-0" />
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
