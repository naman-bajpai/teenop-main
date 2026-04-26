"use client";

import { Facebook, Instagram, Video, Linkedin, Heart, Mail, MapPin, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

interface FooterProps {
  user?: any | null;
}

export default function Footer({ user }: FooterProps) {
  const socialLinks = [
    { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61574994367732", label: "Facebook" },
    { icon: Instagram, href: "https://www.instagram.com/teenop.co/", label: "Instagram" },
    { icon: Video, href: "https://www.tiktok.com/@teenop.co", label: "TikTok" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/teenop-teen-opportunity-2b95593a8/", label: "LinkedIn" },
  ];

  const teenLinks = [
    { label: "Start Earning", href: "/signup" },
    { label: "My Teen Hustle", href: "/my-teen-hustle" },
    { label: "Earnings", href: "/earnings" },
    { label: "Resources", href: "/blog" },
  ];

  const neighborLinks = [
    { label: "Find Services", href: "/services" },
    { label: "My Requests", href: "/my-requests" },
    { label: "Messages", href: "/messages" },
    { label: "Support", href: "/help" },
  ];

  const legalLinks = [
    { label: "Our Story", href: "/our-story" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Safety", href: "/safety" },
  ];

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white text-slate-800">
      {!user && (
        <div className="mx-auto max-w-7xl px-6 pt-14 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#434c9d]">Join TeenOp</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Start earning in your neighborhood.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  Meet local neighbors, offer real services, and build trust through completed jobs.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/signup">
                  <Button className="h-12 w-full rounded-xl bg-[#434c9d] px-6 font-semibold text-white hover:bg-[#434c9d]/90 sm:w-auto">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button
                    variant="ghost"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
                  >
                    Browse Services
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 pb-8 pt-14 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200">
                <Image src="/images/newlogo.png" alt="TeenOp" width={28} height={28} className="object-contain" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">TeenOp</span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              Teen-powered marketplace connecting neighbors to trusted local help.
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-900"
                >
                  <social.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">For Teens</h4>
            <ul className="mt-4 space-y-3">
              {teenLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">For Neighbors</h4>
            <ul className="mt-4 space-y-3">
              {neighborLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Contact</h4>
            <div className="mt-4 space-y-3 text-sm">
              <a href="mailto:teenop@gmail.com" className="flex items-center gap-2 font-medium text-slate-600 transition-colors hover:text-slate-900">
                <Mail className="h-4 w-4" />
                teenop@gmail.com
              </a>
              <p className="flex items-center gap-2 font-medium text-slate-500">
                <MapPin className="h-4 w-4" />
                Bradenton, FL
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            © {new Date().getFullYear()} TeenOp. Made with <Heart className="h-3 w-3 fill-[#ff725a] text-[#ff725a]" /> by the Team
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
