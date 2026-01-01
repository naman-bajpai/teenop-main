"use client";
import React from "react";
import AuthenticatedNavbar from "@/components/AuthenticatedNavbar";
import Footer from "@/components/Footer";

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

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User | null;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-orange-50/20 flex flex-col">
      <AuthenticatedNavbar user={user} />
      <main className="flex-1">
        {children}
      </main>
      <Footer user={user} />
    </div>
  );
}
