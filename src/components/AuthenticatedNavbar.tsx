"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, MessageCircle, User, Home, Briefcase } from "lucide-react";
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
  const [overHero, setOverHero] = useState(true);

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

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigationItems = [
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
    {
      name: "My Teen Hustle",
      href: "/my-teen-hustle",
      icon: Briefcase,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
    },
  ];

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
            src="/images/teenop_logo.png"
            alt="TeenOp Logo"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className={clsx(
            "text-xl font-bold tracking-tight transition-colors",
            overHero ? "text-white" : "text-[#434c9d]"
          )}>
            TeenOp
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  className={clsx(
                    "flex items-center gap-2 transition-colors",
                    isActive(item.href)
                      ? "bg-[#ff725a] text-white hover:bg-[#ff725a]/90"
                      : overHero
                        ? "text-white/90 hover:text-white hover:bg-white/10"
                        : "text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* User Info & Logout */}
        <div className="hidden items-center gap-4 md:flex">
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
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
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                overHero ? "bg-white/20" : "bg-[#23a699]"
              )}>
                <span className={clsx(
                  "font-semibold text-sm transition-colors",
                  overHero ? "text-white" : "text-white"
                )}>
                  {(user.first_name?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()}
                </span>
              </div>
            </div>
          )}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className={clsx(
              "flex items-center gap-2 transition-colors",
              overHero
                ? "text-white/90 hover:text-white hover:bg-white/10"
                : "text-[#434c9d] hover:text-red-700 hover:bg-red-50"
            )}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
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
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-2 space-y-1">
            {navigationItems.map((item) => {
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
            <div className="pt-2 border-t border-slate-200">
              {user && (
                <div className="px-3 py-2 text-sm text-[#434c9d]">
                  <p className="font-medium">
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user.name || "User"
                    }
                  </p>
                  <p className="text-xs text-[#434c9d]/70">
                    {user.role || "Customer & Provider"}
                  </p>
                </div>
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
