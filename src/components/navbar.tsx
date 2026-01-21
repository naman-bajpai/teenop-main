"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [overHero, setOverHero] = useState(true);

  // Detect when nav is overlapping the hero
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("#hero");
    if (!hero) {
      setOverHero(false);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => setOverHero(entries[0].isIntersecting),
      { root: null, threshold: 0, rootMargin: "-64px 0px 0px 0px" } // ~ h-16
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        overHero
          ? "bg-transparent border-b border-transparent"
          : "bg-white/80 backdrop-blur-xl border-b border-gray-100/80 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)]"
      )}
      role="banner"
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10"
        aria-label="Main"
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="relative">
            <Image
              src="/images/newlogo.png"
              alt="TeenOp Logo"
              width={180}
              height={180}
              className={cn(
                "h-14 w-14 object-contain transition-all duration-300",
                !overHero && "brightness-105"
              )}
            />
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className={cn(
            "text-xl font-black tracking-tight transition-colors duration-300",
            overHero ? "text-white" : "text-gray-900"
          )}>
            TeenOp
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "font-bold text-sm transition-all duration-300 rounded-xl px-5 h-10",
                overHero
                  ? "text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              size="sm"
              className={cn(
                "font-bold text-sm transition-all duration-300 rounded-xl px-6 h-10 shadow-lg active:scale-95",
                overHero
                  ? "bg-white text-[#434c9d] hover:bg-white/90 shadow-white/10"
                  : "bg-[#434c9d] text-white hover:bg-[#434c9d]/90 shadow-[#434c9d]/20"
              )}
            >
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile buttons */}
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "font-bold text-sm transition-all duration-300 rounded-xl px-4 h-9",
                overHero
                  ? "text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              size="sm"
              className={cn(
                "font-bold text-sm transition-all duration-300 rounded-xl px-5 h-9 shadow-lg active:scale-95",
                overHero
                  ? "bg-white text-[#434c9d] hover:bg-white/90 shadow-white/10"
                  : "bg-[#434c9d] text-white hover:bg-[#434c9d]/90 shadow-[#434c9d]/20"
              )}
            >
              Sign Up
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
