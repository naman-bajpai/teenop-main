"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

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
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl text-gray-900">
                Privacy Policy
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500">Last Updated: November 15, 2025</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
            <p className="text-lg leading-relaxed">
              TeenOp (&quot;TeenOp,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates an online marketplace based in Sarasota, Florida, United States. TeenOp connects teen service providers ages 13–22 with community members seeking local services. This Privacy Policy explains how we collect, use, share, and protect personal information when you use our website, platform, and related services (the &quot;Platform&quot;).
            </p>
            <p className="text-lg leading-relaxed font-medium">
              By using TeenOp, you agree to this Privacy Policy.
            </p>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">1. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-gray-900">A. Information You Provide</h3>
              <p>We may collect the following information when you create an account or use the Platform:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name</li>
                <li>Email address</li>
                <li>Age or date of birth</li>
                <li>Parent or guardian email address for users under 18</li>
                <li>Profile information and service listings</li>
                <li>Messages sent through the Platform</li>
                <li>Reviews, ratings, and other content you submit</li>
                <li>Communications with TeenOp support</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900">B. Payment Information</h3>
              <p>TeenOp does not store full payment card or bank account details.</p>
              <p>Payments, payouts, and tips are processed through third-party payment processors such as Stripe. Stripe may collect payment and banking information in accordance with its own privacy policy.</p>

              <h3 className="text-xl font-semibold text-gray-900">C. Automatically Collected Information</h3>
              <p>We may automatically collect limited technical information such as:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>IP address</li>
                <li>Device and browser type</li>
                <li>Pages visited and actions taken on the Platform</li>
              </ul>
              <p>This information is used to help operate, secure, and improve the Platform.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">2. Users Under 18</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>TeenOp allows users ages 13–17 to create accounts and offer services.</li>
                <li>When a user under 18 registers, TeenOp sends an informational email to a parent or guardian.</li>
                <li>TeenOp does not require verified parental consent at this time.</li>
                <li>Parents or guardians may contact TeenOp to request account restriction or deletion.</li>
                <li>TeenOp does not knowingly collect personal information from children under 13.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">3. Messaging and Communications</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>All communication between teen service providers and community buyers takes place through the TeenOp Platform.</li>
                <li>Personal phone numbers and personal email addresses are not shared on the Platform.</li>
                <li>Physical addresses are not shared by default and may only be shared by user choice if a service takes place at a buyer&apos;s or teen&apos;s home.</li>
                <li>TeenOp recommends that teens choose public locations whenever possible.</li>
                <li>Messages may be monitored or reviewed for safety, policy compliance, and community standards.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">4. How We Use Information</h2>
              <p>We use personal information to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Create and manage user accounts</li>
                <li>Facilitate service listings, bookings, payments, tips, and reviews</li>
                <li>Notify parents or guardians of under-18 users</li>
                <li>Communicate with users regarding support or updates</li>
                <li>Maintain safety, trust, and platform functionality</li>
                <li>Comply with applicable U.S. laws</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">5. How We Share Information</h2>
              <p>We may share information:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Between users as necessary to complete transactions</li>
                <li>With third-party service providers such as Stripe</li>
                <li>With vendors that support hosting, infrastructure, or customer service</li>
                <li>When required by law or to protect TeenOp, users, or the public</li>
              </ul>
              <p className="font-medium">TeenOp does not sell personal information.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">6. Cookies and Similar Technologies</h2>
              <p>TeenOp may use cookies or similar technologies to support website functionality, security, and performance. Third-party services integrated into the Platform may also use cookies.</p>
              <p>You may control cookies through your browser settings, though some features may not function properly.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">7. Data Security</h2>
              <p>TeenOp uses reasonable administrative and technical safeguards to protect personal information. However, no method of transmission or storage is completely secure.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">8. Data Retention</h2>
              <p>We retain personal information only as long as necessary for operational, legal, and safety purposes. Users or parents may request account deletion by contacting us.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">9. Your Rights</h2>
              <p>Depending on your location, you may request access to, correction of, or deletion of your personal information, subject to legal requirements.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">10. Changes to This Policy</h2>
              <p>TeenOp may update this Privacy Policy from time to time. Continued use of the Platform constitutes acceptance of the updated policy.</p>
            </div>

            <div className="rounded-xl border-2 border-[#96cbc3]/30 bg-[#434c9d]/5 p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">11. Contact Us</h2>
              <p className="font-semibold text-gray-900">TeenOp</p>
              <p>Sarasota, Florida, USA</p>
              <p className="mt-2">
                Email:{" "}
                <a href="mailto:teenop.co@gmail.com" className="font-semibold text-[#434c9d] hover:text-[#96cbc3] transition-colors">
                  teenop.co@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
