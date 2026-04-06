"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Browse Services", href: "/services" },
  { label: "Our Story", href: "/our-story" },
  { label: "Safety", href: "/safety" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [shape, setShape] = useState("rounded-full");
  const shapeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onHeroPage = pathname === "/";
  const showLogo = !onHeroPage || scrolled;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (shapeTimer.current) clearTimeout(shapeTimer.current);
    if (mobileOpen) {
      setShape("rounded-[28px]");
    } else {
      shapeTimer.current = setTimeout(() => setShape("rounded-full"), 280);
    }
    return () => { if (shapeTimer.current) clearTimeout(shapeTimer.current); };
  }, [mobileOpen]);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 px-4 pt-3.5" role="banner">
      <div
        className={cn(
          "mx-auto w-full max-w-7xl flex flex-col transition-all duration-300",
          shape,
          scrolled
            ? "bg-white/85 shadow-[0_8px_32px_rgba(0,0,0,0.10),0_1px_0_rgba(0,0,0,0.04)] border border-black/[0.07] backdrop-blur-2xl"
            : "bg-white/70 shadow-[0_2px_16px_rgba(0,0,0,0.07)] border border-black/[0.06] backdrop-blur-xl"
        )}
      >
        {/* ── Main row ── */}
        <div className="flex items-center gap-2 px-3 py-3">

          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            tabIndex={showLogo ? 0 : -1}
            className={cn(
              "shrink-0 transition-all duration-300 hover:opacity-75",
              showLogo ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <Image
              src="/images/newlogo copy.png"
              alt="TeenOp"
              width={4412}
              height={943}
              className="h-7 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav — centred */}
          <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-4 py-2 text-[14.5px] font-semibold rounded-full transition-colors duration-200",
                  isActive(link.href)
                    ? "text-slate-900 bg-black/[0.06]"
                    : "text-slate-500 hover:text-slate-900 hover:bg-black/[0.04]"
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-[#E8634A]" />
                )}
              </Link>
            ))}
          </nav>

          {/* Spacer on mobile */}
          <div className="flex-1 lg:hidden" />

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/login"
              className="px-4 py-2 text-[14.5px] font-semibold text-slate-500 rounded-full transition-colors hover:text-slate-900 hover:bg-black/[0.04]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E8634A] px-5 py-2 text-[14.5px] font-bold text-white transition-all duration-200 hover:bg-[#d45539] hover:-translate-y-px shadow-[0_0_16px_rgba(232,99,74,0.35)] hover:shadow-[0_0_24px_rgba(232,99,74,0.55)]"
            >
              Join TeenOp
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.04] text-slate-500 transition-colors hover:text-slate-900 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            type="button"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Mobile menu ── */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out md:hidden",
            mobileOpen ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0"
          )}
        >
          <div className="border-t border-black/[0.06] px-3 pb-3 pt-2.5">
            <nav className="flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-black/[0.06] text-slate-900"
                      : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-2.5 flex flex-col gap-2 border-t border-black/[0.06] pt-2.5">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl border border-black/[0.08] px-4 py-2.5 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-black/[0.04] hover:text-slate-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E8634A] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(232,99,74,0.3)]"
              >
                Join TeenOp
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
