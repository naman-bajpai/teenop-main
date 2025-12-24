"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
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
              <Link href="/neighborhood">
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
                <Link href="/my-teen-hustle" className="hover:text-gray-900">
                  My Teen Hustle
                </Link>
              </li>
              <li>
                <Link href="/earnings" className="hover:text-gray-900">
                  Earnings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold">For Parents</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link href="/neighborhood" className="hover:text-gray-900">
                  Browse Services
                </Link>
              </li>
              <li>
                <Link href="/my-requests" className="hover:text-gray-900">
                  My Requests
                </Link>
              </li>
              <li>
                <Link href="/messages" className="hover:text-gray-900">
                  Messages
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} TeenOp. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/our-story" className="text-sm text-gray-600 hover:text-gray-900">
                Our Story
              </Link>
              <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">
                Contact
              </Link>
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

