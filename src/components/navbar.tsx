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
          className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#434c9d]"
        >
          <Image
            src="/images/teenop_logo.png"
            alt="TeenOp Logo"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span
            className={clsx(
              "text-xl font-bold tracking-tight",
              overHero ? "text-white" : "text-[#434c9d]"
            )}
          >
            TeenOp
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                className={clsx(
                  "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#434c9d]",
                  overHero
                    ? "text-white hover:text-white/90 hover:bg-white/10"
                    : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
                )}
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                className={clsx(
                  "cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2",
                  overHero
                    ? "bg-white text-[#434c9d] hover:bg-slate-100"
                    : "bg-[#ff725a] hover:bg-[#ff725a]/90 text-white"
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
                "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#434c9d]",
                overHero
                  ? "text-white hover:text-white/90 hover:bg-white/10"
                  : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
              )}
            >
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              size="sm"
              className={clsx(
                "cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2",
                overHero
                  ? "bg-white text-[#434c9d] hover:bg-slate-100"
                  : "bg-[#ff725a] hover:bg-[#ff725a]/90 text-white"
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
