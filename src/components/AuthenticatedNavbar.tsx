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
  Map,
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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
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
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Neighborhood", href: "/neighborhood", icon: Map },
    { name: "Messages", href: "/messages", icon: MessageCircle },
    { name: "Requests", href: "/my-requests", icon: Calendar },
    ...(user?.role === "teen"
      ? [
          { name: "Services", href: "/my-services", icon: Sparkles },
          { name: "Bookings", href: "/my-teen-hustle", icon: Briefcase },
          { name: "Earnings", href: "/earnings", icon: Wallet },
        ]
      : []),
  ];

  const isActive = (href: string) => pathname === href;
  const initials = (user?.first_name?.charAt(0) || user?.name?.charAt(0) || "U").toUpperCase();
  const displayName = user?.first_name || user?.name || "User";
  const roleLabel = user?.role === "teen" ? "Teen Provider" : user?.role || "Member";

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-b border-slate-200/60"
          : "bg-white/50 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2.5 sm:px-8 lg:px-10">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Image
            src="/images/newlogo copy.png"
            alt="TeenOp"
            width={4412}
            height={943}
            className="h-6 w-auto sm:h-7"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isMessages = item.name === "Messages";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                  active
                    ? "text-[#434c9d] bg-[#434c9d]/[0.07]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-900/[0.04]"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", active && "text-[#434c9d]")} />
                {item.name}
                {isMessages && unreadMessageCount > 0 && (
                  <span className="min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full bg-[#E8634A] px-1 text-[10px] font-bold text-white leading-none">
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side: user menu (desktop) */}
        <div className="hidden lg:flex items-center shrink-0" ref={userMenuRef}>
          {user && (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3 transition-all duration-200",
                  isUserMenuOpen
                    ? "bg-slate-100"
                    : "hover:bg-slate-900/[0.04]"
                )}
              >
                <div className="relative">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || "User"}
                      className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200/60"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#434c9d] to-[#6c74c4] text-xs font-bold text-white">
                      {initials}
                    </div>
                  )}
                  {user.is_verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.5px] border-white bg-emerald-500">
                      <CheckCircle2 className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{displayName}</p>
                  <p className="text-[11px] text-slate-400 leading-tight">{roleLabel}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    isUserMenuOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-white shadow-xl shadow-black/[0.08] ring-1 ring-slate-200/70 overflow-hidden"
                  >
                    <div className="px-4 py-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name || "User"}
                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200/60"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#434c9d] to-[#6c74c4] text-sm font-bold text-white">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <Link
                        href="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive("/profile")
                            ? "bg-[#434c9d]/[0.07] text-[#434c9d]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <User className="h-4 w-4" />
                        Profile & Settings
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && unreadMessageCount > 0 && (
            <Link
              href="/messages"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full bg-[#E8634A] px-1 text-[10px] font-bold text-white leading-none">
                {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
              </span>
            </Link>
          )}
          <button
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed left-3 right-3 top-[4rem] z-50 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl bg-white shadow-xl shadow-black/[0.08] ring-1 ring-slate-200/70 lg:hidden"
            >
              {/* User info header */}
              {user && (
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || "User"}
                      className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200/60"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#434c9d] to-[#6c74c4] text-sm font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  {user.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
              )}

              {/* Nav items */}
              <div className="p-2">
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
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
                        active
                          ? "bg-[#434c9d]/[0.07] text-[#434c9d]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          active ? "bg-[#434c9d]/10 text-[#434c9d]" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1">{item.name}</span>
                      {isMessages && unreadMessageCount > 0 ? (
                        <span className="rounded-full bg-[#E8634A] px-2 py-0.5 text-[10px] font-bold text-white">
                          {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                        </span>
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Bottom actions */}
              <div className="p-2 border-t border-slate-100">
                <Link
                  href="/profile"
                  onClick={closeMenus}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
                    isActive("/profile")
                      ? "bg-[#434c9d]/[0.07] text-[#434c9d]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      isActive("/profile") ? "bg-[#434c9d]/10 text-[#434c9d]" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <User className="h-4 w-4" />
                  </div>
                  <span className="flex-1">Profile & Settings</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left">Log out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
