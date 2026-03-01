"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
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
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl text-gray-900">
                Terms of Service
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500">Last Updated: November 13, 2025</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
            <p className="text-lg leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of TeenOp&apos;s website, platform, and services (collectively, the &quot;Platform&quot;). TeenOp is operated from Sarasota, Florida, United States. By accessing or using TeenOp, you agree to be bound by these Terms. If you do not agree, do not use the Platform.
            </p>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">1. About TeenOp</h2>
              <p>TeenOp is an online marketplace that connects teen service providers ages 13–22 with community members seeking local services. TeenOp provides a platform for listing, discovering, booking, and paying for services, but TeenOp does not itself provide the services offered on the Platform.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">2. Eligibility and Accounts</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>You must be at least 13 years old to use TeenOp.</li>
                <li>Users between the ages of 13 and 17 may use the Platform with parental awareness.</li>
                <li>Users must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>TeenOp may suspend or terminate accounts that violate these Terms or the Community Standards.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">3. Users Under 18</h2>
              <p>If you are under 18:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>A parent or guardian may be notified of your account.</li>
                <li>TeenOp does not require verified parental consent at this time.</li>
                <li>Parents or guardians may contact TeenOp to request account restrictions or deletion.</li>
                <li>TeenOp does not knowingly permit children under 13 to use the Platform.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">4. Services and Transactions</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Teen service providers are independent individuals and are not employees, contractors, or agents of TeenOp.</li>
                <li>Community buyers contract directly with teen service providers.</li>
                <li>TeenOp does not guarantee the quality, safety, or legality of services.</li>
                <li>Users are responsible for complying with all applicable local, state, and federal laws.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">5. Payments, Fees, and Tips</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Payments, payouts, and tips are processed through third-party payment processors such as Stripe.</li>
                <li>TeenOp does not store full payment card or bank account details.</li>
                <li>TeenOp may charge service or platform fees, which will be disclosed before payment.</li>
                <li>All payments are subject to Stripe&apos;s terms and policies.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">6. Messaging and Communication</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>All communication between users must take place through the TeenOp Platform.</li>
                <li>Sharing personal phone numbers, email addresses, or social media accounts is prohibited.</li>
                <li>Messages may be monitored or reviewed for safety and compliance.</li>
                <li>Users agree not to circumvent the Platform for transactions.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">7. Safety and Location of Services</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Physical addresses are not shared by default.</li>
                <li>Addresses may be shared by user choice if a service takes place at a buyer&apos;s or teen&apos;s home.</li>
                <li>TeenOp recommends that teens choose public locations whenever possible.</li>
                <li>Users assume all risks associated with meeting in person.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">8. Reviews and User Content</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Users may submit reviews, ratings, and messages.</li>
                <li>Content must be truthful, respectful, and compliant with Community Standards.</li>
                <li>TeenOp may remove content that violates these Terms.</li>
                <li>By posting content, you grant TeenOp a non-exclusive, royalty-free license to use it for platform operation.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">9. Community Standards</h2>
              <p>All users must comply with TeenOp&apos;s Community Standards, which are incorporated into these Terms by reference. Violations may result in account suspension or removal.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">10. Prohibited Conduct</h2>
              <p>Users may not:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violate any laws or regulations</li>
                <li>Harass, threaten, or exploit others</li>
                <li>Share prohibited personal contact information</li>
                <li>Post false, misleading, or inappropriate content</li>
                <li>Attempt to bypass TeenOp&apos;s payment or messaging systems</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">11. Termination</h2>
              <p>TeenOp may suspend or terminate access to the Platform at any time for violations of these Terms, Community Standards, or for safety reasons.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">12. Disclaimers</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>TeenOp provides the Platform on an &quot;as is&quot; and &quot;as available&quot; basis.</li>
                <li>TeenOp makes no warranties regarding services provided by users.</li>
                <li>TeenOp is not responsible for disputes between users.</li>
              </ul>
            </div>

            <div id="limitation-of-liability" className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">13. Limitation of Liability</h2>
              <p>To the fullest extent permitted by law, TeenOp shall not be liable for any indirect, incidental, or consequential damages arising out of use of the Platform or services arranged through it.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">14. Indemnification</h2>
              <p>You agree to indemnify and hold harmless TeenOp from claims arising out of your use of the Platform, violation of these Terms, or interactions with other users.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">15. Governing Law</h2>
              <p>These Terms are governed by the laws of the State of Florida, without regard to conflict of law principles.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">16. Changes to These Terms</h2>
              <p>TeenOp may update these Terms from time to time. Continued use of the Platform constitutes acceptance of the updated Terms.</p>
            </div>

            <div className="rounded-xl border-2 border-[#96cbc3]/30 bg-[#434c9d]/5 p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">17. Contact Information</h2>
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
