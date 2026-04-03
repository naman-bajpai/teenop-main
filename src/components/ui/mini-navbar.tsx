"use client";

import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface MiniNavItem {
  href: string;
  label: string;
}

interface MiniAnimatedNavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface MiniNavbarProps {
  links?: MiniNavItem[];
  loginHref?: string;
  signupHref?: string;
}

export function MiniAnimatedNavLink({
  href,
  children,
  className,
  onClick,
}: MiniAnimatedNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative inline-flex h-5 items-center overflow-hidden text-sm font-medium text-slate-300 transition-colors hover:text-white",
        className,
      )}
    >
      <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
        <span>{children}</span>
        <span className="text-white">{children}</span>
      </span>
    </Link>
  );
}

export function Navbar({
  links = [
    { label: "Manifesto", href: "#1" },
    { label: "Careers", href: "#2" },
    { label: "Discover", href: "#3" },
  ],
  loginHref = "/login",
  signupHref = "/signup",
}: MiniNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass("rounded-[28px]");
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass("rounded-full");
      }, 280);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div
        className={cn(
          "mx-auto flex w-full max-w-5xl flex-col border border-white/15 bg-[#0f172a]/72 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all duration-300",
          headerShapeClass,
        )}
      >
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] uppercase text-white/92">
              TeenOp
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {links.map((link) => (
              <MiniAnimatedNavLink key={link.href} href={link.href}>
                {link.label}
              </MiniAnimatedNavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href={loginHref}
              className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white"
            >
              Log In
            </Link>
            <Link
              href={signupHref}
              className="rounded-full bg-gradient-to-r from-white to-slate-200 px-4 py-2 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.02]"
            >
              Sign Up
            </Link>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-200 transition-colors hover:text-white sm:hidden"
            onClick={() => setIsOpen((value) => !value)}
            aria-label={isOpen ? "Close Menu" : "Open Menu"}
            type="button"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out sm:hidden",
            isOpen ? "max-h-[24rem] pt-4 opacity-100" : "max-h-0 pt-0 opacity-0 pointer-events-none",
          )}
        >
          <nav className="flex flex-col items-center gap-4 border-t border-white/10 pt-4 text-base">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-slate-300 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex flex-col gap-3">
            <Link
              href={loginHref}
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-center text-sm font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white"
            >
              Log In
            </Link>
            <Link
              href={signupHref}
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-gradient-to-r from-white to-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-950"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
