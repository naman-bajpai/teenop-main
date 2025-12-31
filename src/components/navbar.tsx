"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import clsx from "clsx";

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
      className={clsx(
        "sticky top-0 z-50 transition-all",
        overHero
          ? "bg-transparent backdrop-blur-0 border-b border-transparent"
          : "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
      )}
      role="banner"
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main"
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#434c9d] transition-transform hover:scale-105 duration-200"
        >
          <Image
            src="/images/newlogo.png"
            alt="TeenOp Logo"
            width={250}
            height={250}
            className="h-20 w-20 transition-all"
          />
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className={clsx(
                  "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#434c9d] transition-all duration-200 px-4",
                  overHero
                    ? "text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm"
                    : "text-[#434c9d] hover:text-[#434c9d] hover:bg-gradient-to-r hover:from-[#96cbc3]/20 hover:to-[#96cbc3]/10"
                )}
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className={clsx(
                  "cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 px-6 shadow-md hover:shadow-lg",
                  overHero
                    ? "bg-white text-[#434c9d] hover:bg-slate-50 hover:scale-105"
                    : "bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] hover:from-[#ff725a]/90 hover:to-[#ff8a6b]/90 text-white hover:scale-105"
                )}
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile buttons */}
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className={clsx(
                "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#434c9d] transition-all duration-200",
                overHero
                  ? "text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm"
                  : "text-[#434c9d] hover:text-[#434c9d] hover:bg-gradient-to-r hover:from-[#96cbc3]/20 hover:to-[#96cbc3]/10"
              )}
            >
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              size="sm"
              className={clsx(
                "cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg",
                overHero
                  ? "bg-white text-[#434c9d] hover:bg-slate-50 hover:scale-105"
                  : "bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] hover:from-[#ff725a]/90 hover:to-[#ff8a6b]/90 text-white hover:scale-105"
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
