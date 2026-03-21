"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Compass, HeartHandshake, Menu, ShieldCheck, X } from "lucide-react";

export default function Navbar() {
  const [overHero, setOverHero] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Browse Services", href: "/services", icon: Compass },
    { label: "Our Story", href: "/our-story", icon: HeartHandshake },
    { label: "Safety", href: "/safety", icon: ShieldCheck },
  ];

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("#hero");
    if (!hero) {
      setOverHero(false);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => setOverHero(entries[0].isIntersecting),
      { root: null, threshold: 0, rootMargin: "-64px 0px 0px 0px" }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [overHero]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8"
      role="banner"
    >
      <div className="mx-auto max-w-7xl">
        <nav
          className={cn(
            "relative overflow-hidden rounded-[28px] border transition-all duration-500",
            overHero && !scrolled
              ? "border-white/20 bg-white/10 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl"
              : "border-slate-200/80 bg-white/90 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.15)] backdrop-blur-2xl"
          )}
        >
          {/* Top highlight line */}
          <div className={cn(
            "absolute inset-x-0 top-0 h-px transition-opacity duration-500",
            overHero && !scrolled ? "bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-100" : "opacity-0"
          )} />
          
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 group">
                <div
                  className={cn(
                    "flex h-12 items-center rounded-2xl border px-3 shadow-sm transition-all duration-500 group-hover:scale-[1.02]",
                    overHero && !scrolled
                      ? "border-white/20 bg-white/10"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <Image
                    src="/images/newlogo copy.png"
                    alt="TeenOp"
                    width={4412}
                    height={943}
                    className="h-7 w-auto"
                  />
                </div>
              </Link>
            </div>

            {/* Desktop Nav Links */}
            <div
              className={cn(
                "hidden items-center gap-1 rounded-2xl border px-1.5 py-1.5 transition-all duration-500 lg:flex",
                overHero && !scrolled
                  ? "border-white/10 bg-white/5"
                  : "border-slate-200/60 bg-slate-50/50"
              )}
            >
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200",
                      overHero && !scrolled
                        ? "bg-white text-[#0f766e] shadow-md shadow-black/5 hover:bg-white hover:text-[#0d9488] hover:shadow-lg"
                        : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", overHero && !scrolled ? "text-[#14b8a6]" : "opacity-70")} />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Desktop Auth Actions */}
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-11 rounded-2xl px-5 text-sm font-bold transition-all duration-200",
                    overHero && !scrolled
                      ? "bg-white text-[#0f766e] shadow-md shadow-black/5 hover:bg-white hover:text-[#0d9488]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className={cn(
                    "h-11 rounded-2xl px-6 text-sm font-black shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                    overHero && !scrolled
                      ? "bg-white text-[#0f766e] shadow-black/10 hover:bg-white hover:text-[#0d9488]"
                      : "bg-slate-900 text-white shadow-slate-900/10 hover:bg-slate-800"
                  )}
                >
                  Join TeenOp
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl transition-all md:hidden",
                overHero && !scrolled
                  ? "bg-black/5 text-slate-900 hover:bg-black/10"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              )}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu Drawer */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden border-t border-slate-100 md:hidden"
              >
                <div className="space-y-4 px-4 pb-6 pt-4">
                  <div className="rounded-3xl bg-slate-900 px-6 py-5 text-white shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      Your local platform
                    </p>
                    <p className="mt-2 text-lg font-bold leading-tight">
                      Find trusted teen services or start offering your own.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm transition-all active:scale-[0.98]"
                        >
                          <div className="rounded-xl bg-slate-50 p-2 text-slate-500">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1">{link.label}</span>
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                        </Link>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
                      <Button variant="outline" className="h-13 w-full rounded-2xl border-2 border-slate-100 text-sm font-bold text-slate-900">
                        Log In
                      </Button>
                    </Link>
                    <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
                      <Button className="h-13 w-full rounded-2xl bg-slate-900 text-sm font-bold text-white">
                        Join Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>
    </motion.header>
  );
}
