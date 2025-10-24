"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/home/HeroSection";
import FeaturedServices from "@/components/home/FeaturedServices";
import { Sparkles, Users, Star } from "lucide-react";
import Navbar from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      {/* Hero Section */}
      <HeroSection user={null} />

      {/* Featured Services */}
      <FeaturedServices services={[]} />

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
      <footer className="bg-gray-100 py-12 text-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-[#434c9d]" aria-hidden />
                <span className="text-xl font-bold">TeenOp</span>
              </div>
              <p className="mb-4 text-gray-600">
                Empowering teens to build their future through entrepreneurship.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">For Teens</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/signup" className="hover:text-gray-900">Start Earning</Link></li>
                <li><Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link></li>
                <li><Link href="#" className="hover:text-gray-900">Resources</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">For Communities</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/services" className="hover:text-gray-900">Find Services</Link></li>
                <li><Link href="#" className="hover:text-gray-900">Safety</Link></li>
                <li><Link href="#" className="hover:text-gray-900">Support</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-300 pt-8 text-center text-gray-500">  
            <p>&copy; {new Date().getFullYear()} TeenOp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
