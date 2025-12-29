"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/home/HeroSection";
import FeaturedServices from "@/components/home/FeaturedServices";
import { Sparkles, Users, Star, ArrowRight, Search } from "lucide-react";
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
      <section className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50 py-20 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#96cbc3]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#ff725a]/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#96cbc3]/20 to-[#434c9d]/20 text-[#434c9d] rounded-full px-6 py-2 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">About TeenOp</span>
            </div>
            <h2 className="mb-4 text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
              What is TeenOp?
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-slate-600 leading-relaxed">
              TeenOp (Teen Opportunity) is a digital marketplace where teens open their
              own service-based businesses — dog walking, lawn care, tutoring, art
              commissions, and more — and neighbors can hire them easily.
            </p>
            <p className="mx-auto max-w-3xl mt-4 text-base text-slate-500 italic">
              Think of it as a modern bulletin board for your town: simple, local, and trusted.
            </p>
          </div>

          {/* Two large cards side-by-side */}
          <div className="grid grid-cols-1 gap-8 md:gap-10 lg:grid-cols-2">
            {/* Teens / Sellers */}
            <div className="group relative rounded-3xl border-2 border-slate-200 bg-white p-10 shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-[#434c9d]/30 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-10 w-10 text-[#434c9d]" aria-hidden />
                </div>
                <h3 className="mb-6 text-3xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">TEENS / SELLERS</h3>
                <ul className="mb-10 space-y-4 text-slate-700">
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#96cbc3]"></div>
                    <span>Make $</span>
                  </li>
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#96cbc3]"></div>
                    <span>Build college résumé</span>
                  </li>
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#96cbc3]"></div>
                    <span>Flexible schedule</span>
                  </li>
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#96cbc3]"></div>
                    <span>Be your own boss</span>
                  </li>
                </ul>
                <Link href="/signup">
                  <Button className="group/btn relative w-full bg-gradient-to-r from-[#434c9d] to-[#5a6bc4] hover:from-[#434c9d]/90 hover:to-[#5a6bc4]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold rounded-xl overflow-hidden">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                      Open Storefront!
                      <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Community / Buyers */}
            <div className="group relative rounded-3xl border-2 border-slate-200 bg-white p-10 shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-[#ff725a]/30 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff725a]/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff725a]/20 to-[#ff8a6b]/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-10 w-10 text-[#ff725a]" aria-hidden />
                </div>
                <h3 className="mb-6 text-3xl font-bold bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] bg-clip-text text-transparent">COMMUNITY / BUYERS</h3>
                <ul className="mb-10 space-y-4 text-slate-700">
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#ff725a]"></div>
                    <span>Lower service prices</span>
                  </li>
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#ff725a]"></div>
                    <span>Take tasks off your plate</span>
                  </li>
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#ff725a]"></div>
                    <span>Hire within your neighborhood</span>
                  </li>
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#ff725a]"></div>
                    <span>Support your local High School</span>
                  </li>
                  <li className="flex items-center gap-3 text-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#ff725a]"></div>
                    <span>Find niche services</span>
                  </li>
                </ul>
                <Link href="/services">
                  <Button className="group/btn relative w-full bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] hover:from-[#ff725a]/90 hover:to-[#ff8a6b]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold rounded-xl overflow-hidden">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Search className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      Search Services
                      <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose TeenOp (re-added beneath split section) */}
      <section className="relative bg-gradient-to-br from-[#434c9d] via-[#5a6bc4] to-[#96cbc3] py-24 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-full px-6 py-2 mb-6">
              <Star className="w-4 h-4" />
              <span className="text-sm font-semibold">Why Choose Us</span>
            </div>
            <h2 className="mb-4 text-4xl md:text-5xl font-bold tracking-tight text-white">
              Why Choose TeenOp?
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-blue-100 leading-relaxed">
              Local, trusted, and fair. Teens grow real-world skills and earn fairly,
              while neighbors get quality help from people right down the street.
            </p>
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup">
              <Button size="lg" className="group relative bg-white text-[#434c9d] hover:bg-white/90 shadow-2xl hover:shadow-3xl transition-all duration-300 px-10 py-7 text-lg font-bold rounded-xl overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Sign Up Today
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#434c9d]/0 via-[#434c9d]/5 to-[#434c9d]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t-2 border-slate-200 bg-gradient-to-b from-white to-slate-50">
        {/* Top CTA strip */}
        <div className="relative bg-gradient-to-r from-slate-50 via-white to-slate-50 overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#96cbc3]/5 via-transparent to-[#ff725a]/5"></div>
          
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-[#434c9d] bg-clip-text text-transparent">
                  Ready to try TeenOp in your town?
                </h3>
                <p className="text-lg text-slate-600 font-medium">
                  Teens earn. Neighbors get help. Communities get stronger.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Link href="/neighborhood" className="w-full md:w-auto">
                  <Button className="group relative w-full bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] hover:from-[#ff725a]/90 hover:to-[#ff8a6b]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold rounded-xl overflow-hidden">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Browse Services
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </Button>
                </Link>
                <Link href="/signup" className="w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="group w-full border-2 border-slate-300 text-slate-900 hover:bg-white hover:border-[#434c9d] hover:text-[#434c9d] transition-all duration-300 px-8 py-6 text-base font-semibold rounded-xl"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      Start as a Teen
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main footer */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
            {/* Brand */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Image src="/images/newlogo.png" alt="TeenOp Logo" width={150} height={150} className="w-24 h-24 drop-shadow-lg" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 rounded-full blur-xl -z-10"></div>
                </div>
              </div>

              <p className="mt-6 max-w-md text-base text-slate-600 leading-relaxed">
                A trusted local marketplace where teens run service-based businesses
                and neighbors hire with confidence.
              </p>

              {/* Contact */}
              <div className="mt-8 space-y-3">
                <a
                  href="mailto:teenop.co@gmail.com"
                  className="group flex items-center gap-3 text-base text-slate-700 hover:text-[#434c9d] transition-colors"
                >
                  <div className="flex-shrink-0 w-3 h-3 rounded-full bg-gradient-to-r from-[#96cbc3] to-[#434c9d] group-hover:scale-125 transition-transform"></div>
                  <span className="font-medium">teenop.co@gmail.com</span>
                </a>
                <a
                  href="tel:614-296-6272"
                  className="group flex items-center gap-3 text-base text-slate-700 hover:text-[#434c9d] transition-colors"
                >
                  <div className="flex-shrink-0 w-3 h-3 rounded-full bg-gradient-to-r from-[#96cbc3] to-[#434c9d] group-hover:scale-125 transition-transform"></div>
                  <span className="font-medium">614-296-6272</span>
                </a>
              </div>

              {/* Social */}
              <div className="mt-8 flex items-center gap-4">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="group relative rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-600 hover:border-[#434c9d] hover:text-[#434c9d] hover:bg-[#434c9d]/5 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm6.35-.9a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z" />
                  </svg>
                </a>

                <a
                  href="#"
                  aria-label="TikTok"
                  className="group relative rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-600 hover:border-[#434c9d] hover:text-[#434c9d] hover:bg-[#434c9d]/5 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M16 3c.4 2.6 2.1 4.7 4.6 5.3V11c-1.9 0-3.6-.6-4.9-1.6V16c0 3.6-2.9 6-6.2 6-3.1 0-5.7-2.3-5.7-5.5C3.8 13.2 6.5 11 9.8 11c.5 0 1 .1 1.4.2v2.9c-.4-.2-.9-.3-1.4-.3-1.6 0-2.9 1.1-2.9 2.7 0 1.5 1.2 2.7 2.9 2.7 1.7 0 3.1-1.1 3.1-3.3V3h3.1Z" />
                  </svg>
                </a>

                <a
                  href="#"
                  aria-label="X"
                  className="group relative rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-600 hover:border-[#434c9d] hover:text-[#434c9d] hover:bg-[#434c9d]/5 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.7l-5.2-6.7L5.2 22H2l7.3-8.4L1 2h6.9l4.7 6.1L18.9 2Zm-1.2 18h1.8L7 3.9H5.1l12.6 16.1Z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="md:col-span-7">
              <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#434c9d]" />
                    For Teens
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <Link href="/signup" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        <span>Start Earning</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/neighborhood" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        <span>Explore Services</span>
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#ff725a]" />
                    For Communities
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <Link href="/our-story" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        <span>Our Story</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/neighborhood" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        <span>Hire Local</span>
                      </Link>
                    </li>
                    <li>
                      <a href="mailto:teenop.co@gmail.com" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        <span>Support</span>
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#96cbc3]" />
                    Admin
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <Link href="/admin/dashboard" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        <span>Dashboard</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 flex flex-col gap-6 border-t-2 border-slate-200 pt-10 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-slate-600">
              &copy; {new Date().getFullYear()} TeenOp. All rights reserved.
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Link href="/privacy" className="text-sm font-medium text-slate-600 hover:text-[#434c9d] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm font-medium text-slate-600 hover:text-[#434c9d] transition-colors">
                Terms
              </Link>
              <Link href="/safety" className="text-sm font-medium text-slate-600 hover:text-[#434c9d] transition-colors">
                Safety
              </Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
