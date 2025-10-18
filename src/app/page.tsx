"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/home/HeroSection";
import FeaturedServices from "@/components/home/FeaturedServices";
import { Sparkles, Users, Star, TrendingUp, ArrowRight } from "lucide-react";
import Navbar from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      {/* Hero Section */}
      <HeroSection user={null} />

      {/* Featured Services */}
      <FeaturedServices services={[]} />

      {/* Features Section */}
      <section className="bg-slate-50 ">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Why Choose TeenOp?
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-600">
              We're building a community where teens can thrive, learn, and earn—while helping neighbors with trusted, local services.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#96cbc3]/20">
                <Users className="h-6 w-6 text-[#434c9d]" aria-hidden />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Community First</h3>
              <p className="text-slate-600">
                Connect with teens in your neighborhood. Build relationships and trust in your local community.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#ff725a]/20">
                <Star className="h-6 w-6 text-[#ff725a]" aria-hidden />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Quality Assured</h3>
              <p className="text-slate-600">
                All teen providers are verified and reviewed by the community. Clear expectations, better outcomes.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#96cbc3]/20">
                <TrendingUp className="h-6 w-6 text-[#434c9d]" aria-hidden />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Fair & Transparent</h3>
              <p className="text-slate-600">
                Up-front pricing and fair compensation. Teens earn what they deserve for their work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#434c9d] via-[#434c9d] to-[#96cbc3] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-lg text-white/90">
            Join teens already earning and learning in their communities.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="h-auto px-8 py-4 text-lg bg-white text-[#434c9d] hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#96cbc3]"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="h-auto px-8 py-4 text-lg border-white text-gray-700 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Already have an account?
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
                Empowering teens to build their future through community service and entrepreneurship.
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
              <h3 className="mb-3 text-lg font-semibold">For Families</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#" className="hover:text-gray-900">Find Services</Link></li>
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
