"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

interface User { id: string; name?: string; email?: string; role?: string; }
interface HeroSectionProps { user: User | null | undefined; }

export default function HeroSection({ user: _user }: HeroSectionProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col overflow-hidden -mt-[72px] pt-[72px]"
      ref={containerRef}
    >
      {/* Background image with subtle parallax movement */}
      <div className="absolute inset-0">
        <motion.div
          className="relative h-[112%] w-full"
          style={{ y: backgroundY }}
        >
          <Image
            src="/images/dog.png"
            alt=""
            fill
            priority
            aria-hidden
            className="object-cover object-[center_35%]"
            sizes="100vw"
          />
        </motion.div>
      </div>

      {/* Content wrapper — row by default, stacked only on mobile */}
      <div className="relative z-10 flex flex-row max-sm:flex-col min-h-[calc(100vh-72px)] w-full">

        {/* Left: Logo + Tagline + Buttons */}
        <div className="flex flex-col items-start justify-start px-8 max-sm:px-6 sm:px-12 lg:px-16 pt-10 lg:pt-14 max-w-xl">

          {/* Logo */}
          <Image
            src="/images/newlogo copy.png"
            alt="TeenOp Logo"
            width={4412}
            height={943}
            className="w-[220px] sm:w-[300px] lg:w-[400px] h-auto"
          />

          {/* Tagline */}
          <p
            className="mt-5 inline-block rounded-xl bg-white/75 px-3 py-2 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight max-w-md lg:max-w-lg backdrop-blur-sm"
            style={{ textShadow: "0 2px 10px rgba(255, 255, 255, 0.45)" }}
          >
            Talented Teens Offering Services to Their Community
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 mt-8 w-full max-w-[min(100%,320px)] sm:max-w-[360px]">
            {/* Browse Services — white/outlined */}
            <Link href="/services" className="w-full">
              <Button
                size="lg"
                className="group w-full min-h-14 px-8 text-base sm:text-lg font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-5 h-5 shrink-0" />
                  Browse Services
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-auto shrink-0" />
                </span>
              </Button>
            </Link>

            {/* Offer Services — coral filled */}
            <Link href="/signup" className="w-full">
              <Button
                size="lg"
                className="group w-full min-h-14 px-8 text-base sm:text-lg font-bold bg-[#E8634A] hover:bg-[#d45539] text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 shrink-0" />
                  Offer Services
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-auto shrink-0" />
                </span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Spacer pushes card to the right (hidden on mobile stack) */}
        <div className="flex-1 max-sm:hidden" />

        {/* Middle-right: Definition Card — mobile-only placement below CTAs */}
        <div className="flex items-start self-stretch px-8 max-sm:px-6 sm:px-12 lg:px-16 pt-10 max-sm:pt-8 lg:pt-14 pb-10">
          <div className="w-full max-w-md rounded-3xl bg-white/90 backdrop-blur-md px-8 py-8 sm:px-9 sm:py-10 shadow-2xl ring-1 ring-black/5">
            {/* Card header */}
            <div className="border-b border-slate-100 pb-5">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
                  teen-op
                </span>
                <span className="text-base sm:text-lg font-semibold text-slate-400 uppercase tracking-widest">
                  [teen opportunity]
                </span>
              </div>
              <p className="mt-1.5 text-base text-slate-400 italic">noun.</p>
            </div>

            {/* Services list */}
            <div className="mt-6">
              <p className="text-sm sm:text-base font-black text-[#E8634A] uppercase tracking-[0.15em] mb-4">
                Services by teens
              </p>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-2.5 sm:gap-y-3">
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
                  <li
                    key={service}
                    className="flex items-start gap-2.5 text-base sm:text-[17px] text-slate-700 font-medium leading-snug"
                  >
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-[#E8634A] shrink-0" />
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
