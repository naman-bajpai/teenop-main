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

interface UserProfile {
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
  user?: UserProfile | null;
}

export default function AuthenticatedNavbar({ user }: AuthenticatedNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attentionCount, setAttentionCount] = useState(0);
  const [customerAttentionCount, setCustomerAttentionCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [shape, setShape] = useState("rounded-full");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const shapeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onHeroPage = pathname === "/dashboard";
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messages/conversations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.conversations) {
            setUnreadCount(data.conversations.reduce((s: number, c: any) => s + (c.unread_count || 0), 0));
          }
        }
      } catch {}
    };
    fetchUnread();
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      ce.detail?.newCount !== undefined ? setUnreadCount(ce.detail.newCount) : fetchUnread();
    };
    window.addEventListener("messagesMarkedAsRead", handler);
    const interval = setInterval(fetchUnread, 60000);
    return () => { clearInterval(interval); window.removeEventListener("messagesMarkedAsRead", handler); };
  }, [user]);

  useEffect(() => {
    if (!user || user.role === "teen") {
      setCustomerAttentionCount(0);
      return;
    }
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/bookings/customer-attention", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.count === "number") setCustomerAttentionCount(data.count);
        }
      } catch {}
    };
    fetch_();
    window.addEventListener("focus", fetch_);
    const interval = setInterval(fetch_, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetch_);
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "teen") { setAttentionCount(0); return; }
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/bookings/provider-attention", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.count === "number") setAttentionCount(data.count);
        }
      } catch {}
    };
    fetch_();
    window.addEventListener("providerAttentionRefresh", fetch_);
    window.addEventListener("focus", fetch_);
    const interval = setInterval(fetch_, 60000);
    return () => { clearInterval(interval); window.removeEventListener("providerAttentionRefresh", fetch_); window.removeEventListener("focus", fetch_); };
  }, [user]);

  const handleLogout = async () => {
    try { await createClient().auth.signOut(); router.push("/login"); } catch {}
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Neighborhood", href: "/neighborhood", icon: Map },
    { name: "Messages", href: "/messages", icon: MessageCircle },
    ...(user?.role !== "teen"
      ? [{ name: "Requests", href: "/my-requests", icon: Calendar }]
      : []),
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
  const closeMenus = () => { setMobileOpen(false); setUserMenuOpen(false); };

  const badgeFor = (name: string) =>
    name === "Messages"
      ? unreadCount
      : name === "Bookings"
        ? attentionCount
        : name === "Requests"
          ? customerAttentionCount
          : 0;

  return (
    <header className="sticky top-0 z-50 px-4 pt-3.5">
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
            href="/dashboard"
            onClick={closeMenus}
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
              className="h-6 w-auto sm:h-7"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-0.5 xl:flex">
            {navItems.map((item) => {
              const badge = badgeFor(item.name);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold rounded-full transition-colors duration-200",
                    isActive(item.href)
                      ? "bg-black/[0.06] text-slate-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-black/[0.04]"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                  {badge > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E8634A] px-1 text-[10.5px] font-bold text-white leading-none">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {isActive(item.href) && (
                    <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-[#E8634A]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Spacer on mobile */}
          <div className="flex-1 xl:hidden" />

          {/* Desktop user button */}
          <div className="hidden shrink-0 xl:flex" ref={userMenuRef}>
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-2 py-1.5 transition-all duration-200",
                    userMenuOpen
                      ? "border-black/[0.10] bg-black/[0.07] text-slate-900"
                      : "border-black/[0.07] bg-black/[0.04] text-slate-900 hover:border-black/[0.10] hover:bg-black/[0.06]"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#434c9d] to-[#6c74c4] text-[11px] font-bold text-white">
                        {initials}
                      </div>
                    )}
                    {user.is_verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 ring-[1.5px] ring-white">
                        <CheckCircle2 className="h-2 w-2 text-white" />
                      </span>
                    )}
                  </div>
                  {/* Name only */}
                  <div className="min-w-0 pr-0.5">
                    <p className="truncate text-[13.5px] font-bold leading-tight text-slate-900">{displayName}</p>
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200", userMenuOpen && "rotate-180")} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2.5 w-64 overflow-hidden rounded-[22px] border border-black/[0.07] bg-white/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
                    {/* User card */}
                    <div className="flex items-center gap-3 rounded-[16px] bg-black/[0.04] px-3 py-3 mb-1">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#434c9d] to-[#6c74c4] text-sm font-bold text-white">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-900">{displayName}</p>
                      </div>
                      {user.is_verified && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      )}
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[13px] font-medium transition-colors",
                        isActive("/profile") ? "bg-black/[0.06] text-slate-900" : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-900"
                      )}
                    >
                      <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      Profile & Settings
                    </Link>

                    <div className="my-1 border-t border-black/[0.06]" />

                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile — quick badges + hamburger */}
          <div className="flex items-center gap-1.5 xl:hidden">
            {user && unreadCount > 0 && (
              <Link
                href="/messages"
                aria-label={`${unreadCount} unread messages`}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.04] text-slate-500"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#E8634A] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </Link>
            )}
            {user?.role === "teen" && attentionCount > 0 && (
              <Link
                href="/my-teen-hustle"
                aria-label={`${attentionCount} bookings need attention`}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.04] text-slate-500"
              >
                <Briefcase className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#E8634A] px-1 text-[9px] font-bold text-white">
                  {attentionCount > 99 ? "99+" : attentionCount}
                </span>
              </Link>
            )}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.04] text-slate-500 transition-colors hover:text-slate-900"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out xl:hidden",
            mobileOpen ? "max-h-[52rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
          )}
        >
          <div className="border-t border-black/[0.06] px-3 pb-3 pt-2.5">
            {/* User card */}
            {user && (
              <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.03] px-3 py-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#434c9d] to-[#6c74c4] text-sm font-bold text-white">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{displayName}</p>
                </div>
                {user.is_verified && (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Verified
                  </span>
                )}
              </div>
            )}

            {/* Nav links */}
            <nav className="flex flex-col gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const badge = badgeFor(item.name);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                      isActive(item.href) ? "bg-black/[0.06] text-slate-900" : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-900"
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.04] shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">{item.name}</span>
                    {badge > 0 ? (
                      <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E8634A] px-1 text-[9px] font-bold text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Profile + logout */}
            <div className="mt-2 flex flex-col gap-0.5 border-t border-black/[0.06] pt-2">
              <Link
                href="/profile"
                onClick={closeMenus}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                  isActive("/profile") ? "bg-black/[0.06] text-slate-900" : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-900"
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.04] shrink-0">
                  <User className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1">Profile & Settings</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
              </Link>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                type="button"
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 shrink-0">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 text-left">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
