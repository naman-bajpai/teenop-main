"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Sparkles,
  User,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  bio?: string;
  age?: number;
  city?: string;
  state?: string;
  phone?: string;
  parent_email?: string;
  parent_phone?: string;
  is_verified?: boolean;
  status?: string;
}

interface AuthenticatedNavbarProps {
  user?: User | null;
}

export default function AuthenticatedNavbar({ user }: AuthenticatedNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messages/conversations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.conversations) {
            setUnreadMessageCount(
              data.conversations.reduce((s: number, c: any) => s + (c.unread_count || 0), 0)
            );
          }
        }
      } catch {}
    };
    fetchUnread();
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      ce.detail?.newCount !== undefined ? setUnreadMessageCount(ce.detail.newCount) : fetchUnread();
    };
    window.addEventListener("messagesMarkedAsRead", handler);
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("messagesMarkedAsRead", handler);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await createClient().auth.signOut();
      router.push("/login");
    } catch {}
  };

  const navItems = [
    { name: "Neighborhood", href: "/neighborhood", icon: Home },
    { name: "Messages", href: "/messages", icon: MessageCircle },
    { name: "My Requests", href: "/my-requests", icon: Calendar },
    ...(user?.role === "teen"
      ? [
          { name: "My Services", href: "/my-services", icon: Sparkles },
          { name: "Dashboard", href: "/my-teen-hustle", icon: Briefcase },
          { name: "Earnings", href: "/earnings", icon: Wallet },
        ]
      : []),
  ];

  const isActive = (href: string) => pathname === href;
  const initials = (user?.first_name?.charAt(0) || user?.name?.charAt(0) || "U").toUpperCase();
  const displayName = user?.first_name || user?.name || "User";
  const roleLabel = user?.role === "teen" ? "Teen" : user?.role || "Member";
  const shellClasses = overHero
    ? "border-white/15 bg-slate-950/20 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.65)] backdrop-blur-xl"
    : "border-slate-200/80 bg-white/92 text-slate-900 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)] backdrop-blur-2xl";
  const cardClasses = overHero ? "border-white/15 bg-white/10" : "border-slate-200/80 bg-slate-50/85";
  const mutedText = overHero ? "text-white/65" : "text-slate-500";
  const navText = overHero
    ? "text-[#0f766e] hover:text-[#0d9488] bg-white shadow-md shadow-black/10 hover:bg-white hover:shadow-lg"
    : "text-slate-600 hover:text-slate-900";

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
      className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <nav className={cn("relative overflow-visible rounded-[30px] border transition-all duration-300", shellClasses)}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex shrink-0 items-center gap-3" onClick={closeMenus}>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm", cardClasses)}>
                  <Image
                    src="/images/newlogo.png"
                    alt="TeenOp"
                    width={180}
                    height={180}
                    className={cn("h-10 w-10 object-contain transition-all duration-300", !overHero && "brightness-105")}
                  />
                </div>
                <div className="hidden xl:block">
                  <p className={cn("text-[11px] font-black uppercase tracking-[0.22em]", mutedText)}>
                    TeenOp Hub
                  </p>
                  <p className={cn("text-sm font-semibold", overHero ? "text-white" : "text-slate-700")}>
                    Stay in sync with your neighborhood
                  </p>
                </div>
              </Link>
            </div>

            <div className={cn("hidden items-center gap-1 rounded-2xl border px-2 py-2 lg:flex", cardClasses)}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const isMessages = item.name === "Messages";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200",
                      active
                        ? overHero
                          ? "bg-white text-[#0f766e] shadow-md ring-2 ring-[#96cbc3]/60"
                          : "bg-[#434c9d]/10 text-[#434c9d]"
                        : navText,
                      !active && (overHero ? "" : "hover:bg-white")
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", overHero && "text-[#14b8a6]")} />
                    {item.name}
                    {isMessages && unreadMessageCount > 0 && (
                      <span className="ml-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#E8634A] px-1.5 text-[10px] font-black text-white shadow-sm">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                    {active && !overHero && (
                      <motion.span
                        layoutId="auth-nav-active-pill"
                        className="absolute inset-0 -z-10 rounded-xl bg-[#434c9d]/8"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.38 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="hidden items-center gap-3 lg:flex" ref={userMenuRef}>
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen((open) => !open)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-3 py-2 transition-all duration-200",
                      cardClasses,
                      isUserMenuOpen && (overHero ? "bg-white/15" : "bg-white")
                    )}
                  >
                    <div className="relative">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name || "User"}
                          className={cn(
                            "h-10 w-10 rounded-2xl object-cover ring-2",
                            overHero ? "ring-white/25" : "ring-[#434c9d]/15"
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white",
                            overHero ? "from-white/25 to-white/10" : "from-[#434c9d] to-[#96cbc3]"
                          )}
                        >
                          {initials}
                        </div>
                      )}
                      {user.is_verified && (
                        <div className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white bg-[#96cbc3]">
                          <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="text-left leading-tight">
                      <p className={cn("text-sm font-bold", overHero ? "text-white" : "text-slate-900")}>
                        {displayName}
                      </p>
                      <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", mutedText)}>
                        {roleLabel}
                      </p>
                    </div>

                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isUserMenuOpen && "rotate-180",
                        mutedText
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]"
                      >
                        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(150,203,195,0.28),_transparent_48%),linear-gradient(135deg,rgba(67,76,157,0.08),rgba(255,255,255,0.98))] px-5 py-5">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.name || "User"}
                                  className="h-12 w-12 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#434c9d] to-[#96cbc3] text-sm font-bold text-white">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#434c9d]/70">
                                Signed in
                              </p>
                              <p className="mt-1 truncate text-base font-bold text-slate-900">{displayName}</p>
                              <p className="truncate text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 p-3">
                          <Link
                            href="/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all",
                              isActive("/profile")
                                ? "bg-[#434c9d]/8 text-[#434c9d]"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <div
                              className={cn(
                                "rounded-xl p-2",
                                isActive("/profile") ? "bg-[#434c9d]/10" : "bg-slate-100"
                              )}
                            >
                              <User className="h-4 w-4" />
                            </div>
                            <span className="flex-1">Profile settings</span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </Link>

                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-red-500 transition-all hover:bg-red-50"
                          >
                            <div className="rounded-xl bg-red-50 p-2">
                              <LogOut className="h-4 w-4" />
                            </div>
                            <span className="flex-1 text-left">Log out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              {user && (
                <div className={cn("flex items-center gap-2 rounded-2xl border px-2 py-1.5", cardClasses)}>
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || "User"}
                      className="h-8 w-8 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white",
                        overHero ? "bg-white/20" : "bg-gradient-to-br from-[#434c9d] to-[#96cbc3]"
                      )}
                    >
                      {initials}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <p className={cn("text-xs font-bold", overHero ? "text-white" : "text-slate-900")}>
                      {displayName}
                    </p>
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", mutedText)}>
                      {roleLabel}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all",
                  cardClasses,
                  overHero ? "text-white hover:bg-white/15" : "text-slate-900 hover:bg-white"
                )}
                aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: "easeInOut" }}
                className="overflow-hidden border-t border-white/10 lg:hidden"
              >
                <div className="space-y-5 px-4 pb-4 pt-3">
                  {user && (
                    <div className="rounded-[26px] bg-slate-950 px-5 py-4 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.75)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/50">
                        Account
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name || "User"}
                            className="h-11 w-11 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#434c9d] to-[#96cbc3] text-sm font-bold text-white">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold">{displayName}</p>
                          <p className="truncate text-sm text-white/65">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      const isMessages = item.name === "Messages";

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMenus}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                            active
                              ? "border-[#434c9d]/15 bg-[#434c9d]/8 text-[#434c9d]"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
                          )}
                        >
                          <div className={cn("rounded-xl p-2", active ? "bg-[#434c9d]/10" : "bg-slate-100")}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1">{item.name}</span>
                          {isMessages && unreadMessageCount > 0 ? (
                            <span className="rounded-full bg-[#E8634A] px-2 py-0.5 text-[10px] font-black text-white">
                              {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                            </span>
                          ) : (
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="grid gap-2">
                    <Link
                      href="/profile"
                      onClick={closeMenus}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                        isActive("/profile")
                          ? "border-[#434c9d]/15 bg-[#434c9d]/8 text-[#434c9d]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
                      )}
                    >
                      <div className={cn("rounded-xl p-2", isActive("/profile") ? "bg-[#434c9d]/10" : "bg-slate-100")}>
                        <User className="h-4 w-4" />
                      </div>
                      <span className="flex-1">Profile settings</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm font-semibold text-red-500 transition-all hover:bg-red-50"
                    >
                      <div className="rounded-xl bg-white p-2">
                        <LogOut className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-left">Log out</span>
                    </button>
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
