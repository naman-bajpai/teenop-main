"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/home/HeroSection";
import FeaturedServices from "@/components/home/FeaturedServices";
import { Sparkles, Users, Star } from "lucide-react";
import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { Service } from "@/types/service";
import Image from "next/image";

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch("/api/services/public");
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
        }
      } catch (error) {
        console.error("Failed to load services:", error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      {/* Hero Section */}
      <HeroSection user={null} />

      {/* Featured Services */}
      <FeaturedServices services={services} />

      {/* Split Benefits: Teens/Sellers vs Community/Buyers */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              What is TeenOp?
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-600">
              TeenOp (Teen Opportunity) is a digital marketplace where teens open their
              own service-based businesses — dog walking, lawn care, tutoring, art
              commissions, and more — and neighbors can hire them easily.
              <br /><br />
              Think of it as a modern bulletin board for your town: simple, local, and trusted.
            </p>
          </div>

          {/* Two large cards side-by-side */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Teens / Sellers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm transition hover:shadow-md">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-[#96cbc3]/20">
                <Users className="h-8 w-8 text-[#434c9d]" aria-hidden />
              </div>
              <h3 className="mb-6 text-2xl font-semibold">TEENS / SELLERS</h3>
              <ul className="mb-8 list-disc space-y-3 pl-6 text-slate-700">
                <li>Make $</li>
                <li>Build college résumé</li>
                <li>Flexible schedule</li>
                <li>Be your own boss</li>
              </ul>
              <Link href="/signup">
                <Button className="bg-[#434c9d] text-white hover:bg-[#434c9d]/90">
                  Open Storefront!
                </Button>
              </Link>
            </div>

            {/* Community / Buyers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm transition hover:shadow-md">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-[#ff725a]/20">
                <Star className="h-8 w-8 text-[#ff725a]" aria-hidden />
              </div>
              <h3 className="mb-6 text-2xl font-semibold">COMMUNITY / BUYERS</h3>
              <ul className="mb-8 list-disc space-y-3 pl-6 text-slate-700">
                <li>Lower service prices</li>
                <li>Take tasks off your plate</li>
                <li>Hire within your neighborhood</li>
                <li>Support your local High School</li>
                <li>Find niche services</li>
              </ul>
              <Link href="/services">
                <Button className="bg-[#ff725a] text-white hover:bg-[#ff725a]/90">
                  Search Services!
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose TeenOp (re-added beneath split section) */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Why Choose TeenOp?
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-600">
              Local, trusted, and fair. Teens grow real-world skills and earn fairly,
              while neighbors get quality help from people right down the street.
            </p>
          </div>

          <div className="mt-10 text-center">
            <Link href="/signup">
              <Button size="lg" className="bg-[#434c9d] text-white hover:bg-[#434c9d]/90">
                Sign Up Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        {/* Top CTA strip */}
        <div className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Ready to try TeenOp in your town?
                </h3>
                <p className="mt-1 text-slate-600">
                  Teens earn. Neighbors get help. Communities get stronger.
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/services">
                  <Button className="bg-[#ff725a] text-white hover:bg-[#ff725a]/90">
                    Browse Services
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-900 hover:bg-white"
                  >
                    Start as a Teen
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main footer */}
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            {/* Brand */}
            <div className="md:col-span-5">
              <Image src="/images/newlogo.png" alt="TeenOp Logo" width={150} height={150} className="w-20 h-20" />  

              <p className="mt-4 max-w-md text-slate-600">
                A trusted local marketplace where teens run service-based businesses
                and neighbors hire with confidence.
              </p>

              {/* Contact */}
              <div className="mt-6 space-y-2 text-sm text-slate-600">
                <a
                  href="mailto:teenop.co@gmail.com"
                  className="inline-flex items-center gap-2 hover:text-[#434c9d]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#96cbc3]" />
                  teenop.co@gmail.com
                </a>
                <br />
                <span className="h-2 w-2 rounded-full bg-[#96cbc3]" />
                <a
                  href="tel:614-296-6272"
                  className="inline-flex items-center gap-2 hover:text-[#434c9d]"
                >
            
                  614-296-6272
                </a>
              </div>

              {/* Social */}
              <div className="mt-6 flex items-center gap-3">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  {/* Instagram icon */}
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm6.35-.9a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z" />
                  </svg>
                </a>

                <a
                  href="#"
                  aria-label="TikTok"
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  {/* TikTok-ish icon */}
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M16 3c.4 2.6 2.1 4.7 4.6 5.3V11c-1.9 0-3.6-.6-4.9-1.6V16c0 3.6-2.9 6-6.2 6-3.1 0-5.7-2.3-5.7-5.5C3.8 13.2 6.5 11 9.8 11c.5 0 1 .1 1.4.2v2.9c-.4-.2-.9-.3-1.4-.3-1.6 0-2.9 1.1-2.9 2.7 0 1.5 1.2 2.7 2.9 2.7 1.7 0 3.1-1.1 3.1-3.3V3h3.1Z" />
                  </svg>
                </a>

                <a
                  href="#"
                  aria-label="X"
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  {/* X icon */}
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.7l-5.2-6.7L5.2 22H2l7.3-8.4L1 2h6.9l4.7 6.1L18.9 2Zm-1.2 18h1.8L7 3.9H5.1l12.6 16.1Z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="md:col-span-7">
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">For Teens</h3>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    <li>
                      <Link href="/signup" className="hover:text-slate-900">
                        Start Earning
                      </Link>
                    </li>
                    <li>
                      <Link href="/services" className="hover:text-slate-900">
                        Explore Services
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">For Communities</h3>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    <li>
                      <Link href="/our-story" className="hover:text-slate-900">
                        Our Story
                      </Link>
                    </li>
                    <li>
                      <Link href="/services" className="hover:text-slate-900">
                        Hire Local
                      </Link>
                    </li>
                    <li>
                      <a href="mailto:teenop.co@gmail.com" className="hover:text-slate-900">
                        Support
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Admin</h3>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    <li>
                      <Link href="/admin/dashboard" className="hover:text-slate-900">
                        Dashboard
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} TeenOp. All rights reserved.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <Link href="/privacy" className="hover:text-slate-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-900">
                Terms
              </Link>
              <Link href="/safety" className="hover:text-slate-900">
                Safety
              </Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
