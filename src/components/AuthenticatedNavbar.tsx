"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, MessageCircle, User, Home, Briefcase, Calendar, Wallet, FileText, ChevronDown, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import clsx from "clsx";

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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Detect when nav is overlapping the hero section
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Primary navigation items (always visible)
  const primaryNavItems = [
    {
      name: "Neighborhood",
      href: "/neighborhood",
      icon: Home,
    },
    {
      name: "Messages",
      href: "/messages",
      icon: MessageCircle,
    },
  ];

  // Secondary navigation items (in "More" menu)
  const secondaryNavItems = [
    {
      name: "My Requests",
      href: "/my-requests",
      icon: Calendar,
    },
    {
      name: "Quote Requests",
      href: user?.role === "teen" ? "/provider/quote-requests" : "/my-quote-requests",
      icon: FileText,
    },
    ...(user?.role === "teen" ? [
      {
        name: "My Teen Hustle",
        href: "/my-teen-hustle",
        icon: Briefcase,
      },
      {
        name: "Earnings",
        href: "/earnings",
        icon: Wallet,
      },
    ] : []),
  ];

  // All items for mobile menu
  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  const isActive = (href: string) => pathname === href;

  return (
    <header 
      className={clsx(
        "sticky top-0 z-50 transition-all duration-300",
        overHero
          ? "bg-transparent backdrop-blur-0 border-b border-transparent"
          : "bg-white/98 backdrop-blur-md border-b border-slate-200 shadow-sm"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#434c9d]"
        >
          <Image
            src="/images/teenop.png"
            alt="TeenOp Logo"
            width={120}
            height={120}
            className="h-12 w-12"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* Primary items */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className={clsx(
                    "flex items-center gap-2 transition-colors px-3",
                    isActive(item.href)
                      ? "bg-[#ff725a] text-white hover:bg-[#ff725a]/90"
                      : overHero
                        ? "text-white/90 hover:text-white hover:bg-white/10"
                        : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.name}</span>
                </Button>
              </Link>
            );
          })}

          {/* More menu for secondary items */}
          {secondaryNavItems.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant={isMoreMenuOpen ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={clsx(
                  "flex items-center gap-1 px-3 transition-colors",
                  isMoreMenuOpen
                    ? "bg-[#ff725a] text-white hover:bg-[#ff725a]/90"
                    : overHero
                      ? "text-white/90 hover:text-white hover:bg-white/10"
                      : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
                )}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="hidden xl:inline">{user?.role === "parent" ? "Service Requests" : "More"}</span>
                <ChevronDown className={clsx("h-3 w-3 transition-transform", isMoreMenuOpen && "rotate-180")} />
              </Button>

              {isMoreMenuOpen && (
                <div className={clsx(
                  "absolute right-0 top-full mt-1 w-56 rounded-lg border bg-white shadow-lg z-50",
                  overHero ? "border-white/20 bg-white/95 backdrop-blur-md" : "border-gray-200"
                )}>
                  <div className="py-1">
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMoreMenuOpen(false)}
                        >
                          <div
                            className={clsx(
                              "flex items-center gap-3 px-4 py-2 text-sm transition-colors cursor-pointer",
                              active
                                ? "bg-[#ff725a]/10 text-[#ff725a] font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                            {active && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff725a]" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu & Logout */}
        <div className="hidden items-center gap-2 lg:flex">
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                  isUserMenuOpen
                    ? overHero
                      ? "bg-white/20"
                      : "bg-[#96cbc3]/20"
                    : overHero
                      ? "hover:bg-white/10"
                      : "hover:bg-[#96cbc3]/10"
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  overHero ? "bg-white/20" : "bg-[#23a699]"
                )}>
                  <span className="text-white font-semibold text-sm">
                    {(user.first_name?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
                <div className="text-left hidden xl:block">
                  <p className={clsx(
                    "text-sm font-medium transition-colors",
                    overHero ? "text-white" : "text-[#434c9d]"
                  )}>
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user.name || "User"
                    }
                  </p>
                  <p className={clsx(
                    "text-xs transition-colors",
                    overHero ? "text-white/70" : "text-slate-500"
                  )}>
                    {user.role || "Customer & Provider"}
                  </p>
                </div>
                <ChevronDown className={clsx(
                  "h-3 w-3 transition-transform",
                  isUserMenuOpen && "rotate-180",
                  overHero ? "text-white/70" : "text-[#434c9d]"
                )} />
              </button>

              {isUserMenuOpen && (
                <div className={clsx(
                  "absolute right-0 top-full mt-1 w-56 rounded-lg border shadow-lg z-50",
                  overHero ? "border-white/20 bg-white/95 backdrop-blur-md" : "border-gray-200 bg-white"
                )}>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div
                        className={clsx(
                          "flex items-center gap-3 px-4 py-2 text-sm transition-colors cursor-pointer",
                          isActive("/profile")
                            ? "bg-[#ff725a]/10 text-[#ff725a] font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                        {isActive("/profile") && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff725a]" />
                        )}
                      </div>
                    </Link>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && (
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              overHero ? "bg-white/20" : "bg-[#23a699]"
            )}>
              <span className="text-white font-semibold text-sm">
                {(user.first_name?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={clsx(
              "transition-colors",
              overHero
                ? "text-white hover:text-white/80"
                : "text-[#434c9d] hover:text-[#434c9d]/80"
            )}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-2 space-y-1">
            {/* Primary items */}
            <div className="pb-2 border-b border-gray-200">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className={`w-full justify-start gap-2 ${
                        isActive(item.href)
                          ? "bg-[#ff725a] text-white hover:bg-[#ff725a]/90"
                          : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Secondary items */}
            <div className="pt-2">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className={`w-full justify-start gap-2 ${
                        isActive(item.href)
                          ? "bg-[#ff725a] text-white hover:bg-[#ff725a]/90"
                          : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200">
              {user && (
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive("/profile") ? "default" : "ghost"}
                    className={`w-full justify-start gap-2 ${
                      isActive("/profile")
                        ? "bg-[#ff725a] text-white hover:bg-[#ff725a]/90"
                        : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                </Link>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-2 text-[#434c9d] hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
