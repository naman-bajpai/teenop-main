"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
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
          : "bg-white/70 backdrop-blur-md border-b border-slate-200 shadow-sm"
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
          className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Sparkles
            className={clsx("h-7 w-7", overHero ? "text-white" : "text-blue-600")}
            aria-hidden
          />
          <span
            className={clsx(
              "text-xl font-bold tracking-tight",
              overHero ? "text-white" : "text-gray-700"
            )}
          >
            TeenOps
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                className={clsx(
                  "cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600",
                  overHero
                    ? "text-white hover:text-white/90 hover:bg-white/10"
                    : "text-slate-700 hover:text-blue-700 hover:bg-slate-100/60"
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
                    ? "bg-white text-blue-700 hover:bg-slate-100"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
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
                "cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600",
                overHero
                  ? "text-white hover:text-white/90 hover:bg-white/10"
                  : "text-slate-700 hover:text-blue-700 hover:bg-slate-100/60"
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
                  ? "bg-white text-blue-700 hover:bg-slate-100"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
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
