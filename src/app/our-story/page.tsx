"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { Mail, Phone, Sparkles, ArrowLeft } from "lucide-react";

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-orange-50 to-white py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="mb-8 text-[#434c9d] hover:text-[#434c9d]/80 hover:bg-[#96cbc3]/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#434c9d] to-[#96cbc3] shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="page-title">
              <span className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
                Our Story
              </span>
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            {/* Story Section */}
            <div className="mb-16 space-y-6 text-lg leading-relaxed text-gray-700">
              <div className="rounded-xl border-l-4 border-[#434c9d] bg-blue-50/30 p-6">
                <p className="text-xl font-semibold text-[#434c9d] mb-2">The Beginning</p>
                <p>
                  TeenOp was born at my high school lunch table with the simple dream of helping my friends start their own businesses. Entrepreneurship has always come naturally to me, and by my sophomore year of high school I had already launched two small businesses of my own. I saw how capable and talented the people around me were, and I wanted them to have the same chance to capitalize on their skills and creativity.
                </p>
              </div>
              
              <p>
                My senior year of high school, TeenOp, short for "teen opportunity," began gaining traction and support from my school community. What started as an idea shared between friends is now becoming a real platform, with our first beta version officially launching in January 2026. I am incredibly excited to help teens create their own ventures while also giving community members a way to find affordable and reliable help from a teen down the street.
              </p>
              
              <div className="rounded-xl bg-gradient-to-r from-[#434c9d]/10 to-[#96cbc3]/10 p-6">
                <p className="font-semibold text-gray-900 mb-2">Built for Convenience</p>
                <p>
                  TeenOp is built around convenience and connection. Users can search by location, message directly through the platform, book services, and handle payments, reviews, and ratings all in one place. Teens can focus on what they offer, and neighbors can easily find and book the help they need.
                </p>
              </div>
              
              <p>
                My goal for TeenOp is to help communities grow closer by empowering young people to share their talents and by making it easier for neighbors to support one another. We hope you join TeenOp, either as a community member or a teen entrepreneur, in welcoming a new wave of entrepreneurship.
              </p>
              
              <div className="rounded-xl border-2 border-[#96cbc3]/30 bg-orange-50/30 p-6 mt-8">
                <p className="font-semibold text-gray-900 mb-2">Let's Connect</p>
                <p>
                  For partnerships, questions, or collaboration opportunities, please reach out to us at{" "}
                  <a
                    href="mailto:teenop.co@gmail.com"
                    className="font-semibold text-[#434c9d] hover:text-[#96cbc3] transition-colors"
                  >
                    teenop.co@gmail.com
                  </a>
                  . We'd love to connect!
                </p>
              </div>
            </div>

            {/* About the Founder Section */}
            <div className="rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-blue-50/50 to-orange-50/50 p-8 md:p-12 shadow-lg overflow-hidden">
              <div className="mb-8 text-center">
                <h2 className="mb-4 text-3xl font-bold text-gray-900">
                  About the Founder
                </h2>
                <div className="mx-auto mb-6 flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-xl md:h-64 md:w-64">
                  <Image
                    src="/images/Founder.png"
                    alt="Kensington Wheeler, Founder of TeenOp"
                    width={400}
                    height={400}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>
                <h3 className="text-2xl font-bold text-[#434c9d]">
                  Kensington Wheeler
                </h3>
                <p className="mt-2 text-gray-600">
                  Founder & CEO of TeenOp
                </p>
              </div>
              
              <div className="space-y-6 text-lg leading-relaxed text-gray-700">
                <p>
                  <strong className="text-[#434c9d]">Kensington Wheeler</strong> is a sophomore at Florida State University studying Computer Science and Commercial Entrepreneurship at the Jim Moran College of Entrepreneurship. She has always believed that teens are capable of far more than they are often given credit for. Having built businesses since her early teens, she finds her energy in bringing ideas to life and hopes to inspire the next generation to create lives that match their schedules, passions, and lifestyles while gaining real-world business experience along the way.
                </p>
                <p>
                  At Florida State, Kensington works in the entrepreneurship center, where she helps run mentor nights, workshops, and networking events. With a genuine excitement for meeting other entrepreneurs, she naturally steps forward to welcome guests, build connections, and make sure every person in the room feels engaged and supported.
                </p>
                <p>
                  She built TeenOp with one goal in mind: to help teens step confidently into entrepreneurship while strengthening the communities around them. She believes in empowering young people, celebrating creativity, and making it easy for neighbors to support the talents and services offered by the teens right down the street.
                </p>
                <div className="mt-8 rounded-xl border-2 border-[#434c9d]/20 bg-white/80 p-6">
                  <p className="mb-4 font-semibold text-[#434c9d]">
                    Connect with Kensington:
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <a
                      href="mailto:kensingtonwheeler1515@gmail.com"
                      className="flex items-center gap-2 font-semibold text-[#434c9d] transition-colors hover:text-[#96cbc3]"
                    >
                      <Mail className="h-5 w-5" />
                      <span>kensingtonwheeler1515@gmail.com</span>
                    </a>
                    <span className="hidden text-gray-400 sm:inline">•</span>
                    <a
                      href="tel:614-296-6272"
                      className="flex items-center gap-2 font-semibold text-[#434c9d] transition-colors hover:text-[#96cbc3]"
                    >
                      <Phone className="h-5 w-5" />
                      <span>614-296-6272</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 md:p-12 shadow-lg">
            <h2 className="mb-6 text-3xl font-bold text-gray-900 text-center">
              Get in Touch
            </h2>
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center">
              <a
                href="mailto:teenop.co@gmail.com"
                className="flex items-center gap-3 rounded-lg border-2 border-[#434c9d] bg-white px-6 py-4 text-[#434c9d] transition-all hover:bg-[#434c9d] hover:text-white"
              >
                <Mail className="h-5 w-5" />
                <span className="font-semibold">teenop.co@gmail.com</span>
              </a>
              <a
                href="tel:614-296-6272"
                className="flex items-center gap-3 rounded-lg border-2 border-[#96cbc3] bg-white px-6 py-4 text-[#96cbc3] transition-all hover:bg-[#96cbc3] hover:text-white"
              >
                <Phone className="h-5 w-5" />
                <span className="font-semibold">614-296-6272</span>
              </a>
            </div>
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
                <li>
                  <Link href="/signup" className="hover:text-gray-900">
                    Start Earning
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-gray-900">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Resources
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">For Communities</h3>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link href="/services" className="hover:text-gray-900">
                    Find Services
                  </Link>
                </li>
                <li>
                  <Link href="/our-story" className="hover:text-gray-900">
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900">
                    Support
                  </Link>
                </li>
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

