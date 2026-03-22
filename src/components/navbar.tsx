"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Browse Services", href: "/services" },
    { label: "Our Story", href: "/our-story" },
    { label: "Safety", href: "/safety" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-b border-slate-200/60"
          : "bg-white/50 backdrop-blur-md border-b border-transparent"
      }`}
      role="banner"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex shrink-0 items-center transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Image
            src="/images/newlogo copy.png"
            alt="TeenOp"
            width={4412}
            height={943}
            className="h-7 w-auto sm:h-8"
            priority
          />
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-4 py-2 rounded-lg text-sm font-medium text-slate-500 transition-all duration-200 hover:text-slate-900 hover:bg-slate-900/[0.04]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2.5">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04]"
            >
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              size="sm"
              className="h-9 px-5 rounded-lg text-sm font-bold bg-[#E8634A] hover:bg-[#d85a42] active:bg-[#c44f38] text-white shadow-none transition-all duration-200 hover:shadow-md hover:shadow-[#E8634A]/20"
            >
              Join TeenOp
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed left-3 right-3 top-[4.5rem] z-50 rounded-2xl bg-white shadow-xl shadow-black/[0.08] ring-1 ring-slate-200/70 overflow-hidden md:hidden"
            >
              <div className="p-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {link.label}
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </Link>
                ))}
              </div>
              <div className="p-3 pt-0 flex flex-col gap-2 border-t border-slate-100 mt-1 pt-3">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full h-11 rounded-xl text-sm font-bold bg-[#E8634A] hover:bg-[#d85a42] text-white shadow-md shadow-[#E8634A]/15">
                    Join TeenOp
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
