"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/home/HeroSection";
import { Sparkles, Users, Star, ArrowRight, Search, Linkedin } from "lucide-react";
import Navbar from "@/components/navbar";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      {/* Hero Section */}
      <HeroSection user={null} />

      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#96cbc3]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#ff725a]/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              Why Choose TeenOp
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 md:text-xl">
              TeenOp makes it easier for communities to hire capable local teens for everyday jobs while giving young people a real place to build skills, earn money, and grow their confidence.
            </p>
            <p className="mt-4 text-base italic text-slate-500">
              Think of it like a modern town bulletin board for your town.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm">
              <h3 className="text-center text-3xl font-bold tracking-tight text-[#434c9d]">
                Teens
              </h3>
              <ul className="mt-8 space-y-4 text-lg text-slate-700">
                <li>Make money doing what you are already good at</li>
                <li>Build college r&eacute;sum&eacute; experience</li>
                <li>Gain experience</li>
                <li>Set a schedule that works around school and life</li>
                <li>Start learning how to run something of your own</li>
              </ul>
              <Link href="/signup" className="mt-10 block">
                <Button className="group w-full rounded-xl bg-[#434c9d] px-8 py-6 text-base font-semibold text-white hover:bg-[#434c9d]/90">
                  Offer Services
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm">
              <h3 className="text-center text-3xl font-bold tracking-tight text-[#ff725a]">
                Community
              </h3>
              <ul className="mt-8 space-y-4 text-lg text-slate-700">
                <li>Find affordable local help for everyday tasks</li>
                <li>Hire talented teens right in your area</li>
                <li>Support young entrepreneurs close to home</li>
                <li>Discover specialized skills and creative services</li>
                <li>Keep opportunity and spending inside your community</li>
              </ul>
              <Link href="/services" className="mt-10 block">
                <Button className="group w-full rounded-xl bg-[#ff725a] px-8 py-6 text-base font-semibold text-white hover:bg-[#ff725a]/90">
                  Browse Services
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 rounded-[36px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-orange-50/40 p-8 shadow-sm md:grid-cols-[320px_minmax(0,1fr)] md:p-12">
            <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[28px] border-4 border-white shadow-xl">
              <Image
                src="/images/Founder.png"
                alt="Kensington Wheeler, founder of TeenOp"
                width={400}
                height={400}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#434c9d]/60">
                Founder Story
              </p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
                Built from a lunch table idea
              </h2>
              <blockquote className="mt-6 max-w-3xl text-2xl font-medium leading-relaxed text-slate-700">
                &ldquo;TeenOp was born at my high school lunch table with the simple dream of helping my friends start their own businesses.&rdquo;
              </blockquote>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Kensington Wheeler started TeenOp to help talented teens turn their skills into real neighborhood opportunities while giving families a better way to find help close to home.
              </p>
              <Link href="/our-story" className="mt-8 inline-block">
                <Button className="group rounded-xl bg-[#434c9d] px-8 py-6 text-base font-semibold text-white hover:bg-[#434c9d]/90">
                  View Full Story
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
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
                <Link href="/services" className="w-full md:w-auto">
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
                Teen-powered marketplace connecting neighbors to local help
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
                  href="https://www.linkedin.com/in/teenop-teen-opportunity-2b95593a8/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="group relative rounded-xl border-2 border-slate-200 bg-white p-3 text-slate-600 hover:border-[#434c9d] hover:text-[#434c9d] hover:bg-[#434c9d]/5 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <Linkedin className="h-5 w-5" />
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
                      <Link href="/services" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
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
                      <Link href="/services" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-[#434c9d] transition-colors">
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
