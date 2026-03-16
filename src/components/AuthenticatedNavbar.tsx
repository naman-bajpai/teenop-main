"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, MessageCircle, User, Home, Briefcase, Calendar, Wallet, ChevronDown, MoreVertical, Sparkles, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
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

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        // Use cache: 'no-store' to always get fresh data
        const res = await fetch("/api/messages/conversations", {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.conversations) {
            const totalUnread = data.conversations.reduce((sum: number, conv: any) => sum + (conv.unread_count || 0), 0);
            setUnreadMessageCount(totalUnread);
          }
        }
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
    };

    fetchUnreadCount();
    
    // Listen for custom event when messages are marked as read
    const handleMessagesMarkedAsRead = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.newCount !== undefined) {
        setUnreadMessageCount(customEvent.detail.newCount);
      } else {
        fetchUnreadCount();
      }
    };
    window.addEventListener('messagesMarkedAsRead', handleMessagesMarkedAsRead);
    
    // Refresh every 60 seconds (reduced from 30 to reduce load)
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('messagesMarkedAsRead', handleMessagesMarkedAsRead);
    };
  }, [user]);

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
    ...(user?.role === "teen" ? [
      {
        name: "Service Dashboard",
        href: "/my-teen-hustle",
        icon: Briefcase,
      },
    ] : []),
  ];

  // Secondary navigation items (in "More" menu)
  const secondaryNavItems = [
    {
      name: "My Requests",
      href: "/my-requests",
      icon: Calendar,
    },
    ...(user?.role === "teen" ? [
      {
        name: "My Services",
        href: "/my-services",
        icon: Sparkles,
      },
      {
        name: "My Earnings",
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
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        overHero
          ? "bg-transparent border-b border-transparent"
          : "bg-white/80 backdrop-blur-xl border-b border-gray-100/80 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)]"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="relative">
            <Image
              src="/images/newlogo.png"
              alt="TeenOp Logo"
              width={180}
              height={180}
              className={cn(
                "h-14 w-14 object-contain transition-all duration-300",
                !overHero && "brightness-105"
              )}
            />
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-2 lg:flex">
          {/* Primary items */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isMessages = item.name === "Messages";
            const active = isActive(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300 px-4 h-10 rounded-xl font-bold text-sm relative",
                    active
                      ? overHero
                        ? "bg-white/20 text-white"
                        : "bg-[#434c9d]/10 text-[#434c9d]"
                      : overHero
                        ? "text-white/80 hover:text-white hover:bg-white/10"
                        : "text-gray-500 hover:text-[#434c9d] hover:bg-gray-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4 transition-transform", active && "scale-110")} />
                  <span>{item.name}</span>
                  {isMessages && unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ff725a] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-in zoom-in duration-300">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}

          {/* More menu for secondary items */}
          {secondaryNavItems.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={cn(
                  "flex items-center gap-1 px-4 h-10 transition-all duration-300 rounded-xl font-bold text-sm",
                  isMoreMenuOpen
                    ? overHero
                      ? "bg-white/20 text-white"
                      : "bg-[#434c9d]/10 text-[#434c9d]"
                    : overHero
                      ? "text-white/80 hover:text-white hover:bg-white/10"
                      : "text-gray-500 hover:text-[#434c9d] hover:bg-gray-50"
                )}
              >
                <MoreVertical className="h-4 w-4" />
                <span>{user?.role === "parent" ? "Service Requests" : "More"}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", isMoreMenuOpen && "rotate-180")} />
              </Button>

              {isMoreMenuOpen && (
                <div className={cn(
                  "absolute right-0 top-full mt-3 w-64 rounded-[24px] border bg-white/95 backdrop-blur-xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-4 duration-300",
                  overHero ? "border-white/20" : "border-gray-100"
                )}>
                  <div className="space-y-1">
                    {secondaryNavItems.map((item, idx) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMoreMenuOpen(false)}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 text-sm transition-all cursor-pointer rounded-xl group",
                              active
                                ? "bg-[#434c9d]/5 text-[#434c9d] font-bold"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            )}
                          >
                            <div className={cn(
                              "p-2 rounded-lg transition-colors",
                              active ? "bg-[#434c9d]/10" : "bg-gray-100 group-hover:bg-white"
                            )}>
                              <Icon className={cn("h-4 w-4 transition-transform", active && "scale-110")} />
                            </div>
                            <span className="flex-1">{item.name}</span>
                            {active && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#434c9d]" />
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
        <div className="hidden items-center gap-4 lg:flex">
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl p-1.5 pr-4 transition-all duration-300",
                  isUserMenuOpen
                    ? overHero
                      ? "bg-white/20"
                      : "bg-[#434c9d]/10"
                    : overHero
                      ? "hover:bg-white/10"
                      : "hover:bg-gray-50"
                )}
              >
                <div className="relative group">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      className={cn(
                        "w-9 h-9 rounded-xl object-cover ring-2 transition-all duration-300 group-hover:scale-105",
                        overHero ? "ring-white/30" : "ring-[#434c9d]/20"
                      )}
                    />
                  ) : (
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                      overHero ? "bg-white/20" : "bg-gradient-to-br from-[#434c9d] to-[#96cbc3]"
                    )}>
                      <span className="text-white font-bold text-sm">
                        {(user.first_name?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()}
                      </span>
                    </div>
                  )}
                  {user.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#96cbc3] rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="text-left hidden xl:block">
                  <p className={cn(
                    "text-sm font-bold leading-tight transition-colors duration-300",
                    overHero ? "text-white" : "text-gray-900"
                  )}>
                    {user.first_name || user.name || "User"}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                      overHero ? "text-white/60" : "text-gray-400"
                    )}
                  >
                    {user.role === "teen" ? "Teen" : user.role || "Member"}
                  </p>
                </div>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300",
                  isUserMenuOpen && "rotate-180",
                  overHero ? "text-white/60" : "text-gray-400"
                )} />
              </button>

              {isUserMenuOpen && (
                <div className={cn(
                  "absolute right-0 top-full mt-3 w-64 rounded-[24px] border bg-white/95 backdrop-blur-xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-4 duration-300",
                  overHero ? "border-white/20" : "border-gray-100"
                )}>
                  <div className="p-3 border-b border-gray-50 mb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1">Signed in as</p>
                    <p className="text-sm font-bold text-gray-900 truncate ml-1">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <Link href="/profile" onClick={() => setIsUserMenuOpen(false)}>
                      <div className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm transition-all cursor-pointer rounded-xl group",
                        isActive("/profile") ? "bg-[#434c9d]/5 text-[#434c9d] font-bold" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      )}>
                        <div className={cn("p-2 rounded-lg transition-colors", isActive("/profile") ? "bg-[#434c9d]/10" : "bg-gray-100 group-hover:bg-white")}>
                          <User className="h-4 w-4" />
                        </div>
                        <span className="flex-1">My Profile</span>
                        {isActive("/profile") && <div className="w-1.5 h-1.5 rounded-full bg-[#434c9d]" />}
                      </div>
                    </Link>
                    <button
                      onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all cursor-pointer rounded-xl text-red-500 hover:bg-red-50 font-bold group"
                    >
                      <div className="p-2 bg-red-100/50 rounded-lg group-hover:bg-white transition-colors">
                        <LogOut className="h-4 w-4" />
                      </div>
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 lg:hidden">
          {user && (
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'User'}
                  className={cn(
                    "w-9 h-9 rounded-xl object-cover ring-2",
                    overHero ? "ring-white/30" : "ring-[#434c9d]/20"
                  )}
                />
              ) : (
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  overHero ? "bg-white/20" : "bg-[#434c9d]/10"
                )}>
                  <span className={cn("font-bold text-sm", overHero ? "text-white" : "text-[#434c9d]")}>
                    {(user.first_name?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              "h-10 w-10 p-0 rounded-xl transition-all duration-300",
              overHero ? "text-white hover:bg-white/10" : "text-gray-900 hover:bg-gray-50"
            )}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 animate-in slide-in-from-top duration-300">
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Main Menu</p>
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300",
                        active
                          ? "bg-[#434c9d]/5 text-[#434c9d] font-bold"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", active ? "bg-[#434c9d]/10" : "bg-gray-50")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {item.name}
                      {item.name === "Messages" && unreadMessageCount > 0 && (
                        <span className="ml-auto bg-[#ff725a] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                          {unreadMessageCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Account</p>
              <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300",
                    isActive("/profile") ? "bg-[#434c9d]/5 text-[#434c9d] font-bold" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", isActive("/profile") ? "bg-[#434c9d]/10" : "bg-gray-50")}>
                    <User className="h-4 w-4" />
                  </div>
                  My Profile
                </Button>
              </Link>
              <Button
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                variant="ghost"
                className="w-full justify-start gap-4 h-12 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-all duration-300"
              >
                <div className="p-2 bg-red-100/50 rounded-lg">
                  <LogOut className="h-4 w-4" />
                </div>
                Log Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
