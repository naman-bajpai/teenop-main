"use client";
import { Sparkles, Facebook, Instagram, Video, Linkedin, Heart, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

interface FooterProps {
  user?: any | null;
}

export default function Footer({ user }: FooterProps) {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      {/* Top CTA Section - Only for non-logged-in users */}
      {!user && (
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[#434c9d]/5 -z-10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-[#96cbc3]/5 rounded-full blur-3xl -z-10" />
          
          <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
            <div className="bg-white rounded-[40px] p-8 md:p-12 border border-gray-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-[#ff725a]/10 text-[#ff725a] px-4 py-1.5 rounded-full">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Join the community</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                  Ready to start your <span className="text-[#434c9d]">Teen Hustle?</span>
                </h3>
                <p className="text-gray-500 font-medium max-w-md leading-relaxed">
                  Join thousands of teens building their micro-businesses and neighbors getting trusted local help.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Link href="/signup">
                  <Button className="w-full sm:w-auto h-14 px-8 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl font-black shadow-lg shadow-[#434c9d]/20 active:scale-95 transition-all">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/neighborhood">
                  <Button variant="ghost" className="w-full sm:w-auto h-14 px-8 border border-gray-100 rounded-2xl font-black text-gray-600 hover:bg-gray-50">
                    Explore Services
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-12 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm group-hover:scale-110 transition-transform">
                <Image src="/images/newlogo.png" alt="TeenOp" width={32} height={32} className="object-contain" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tighter">TeenOp</span>
            </Link>
            <p className="text-gray-500 font-medium leading-relaxed max-w-sm">
              Empowering the next generation of entrepreneurs by connecting talented teens with their local community.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61574994367732", label: "Facebook" },
                { icon: Instagram, href: "https://www.instagram.com/teenop.co/", label: "Instagram" },
                { icon: Video, href: "https://www.tiktok.com/@teenop.co", label: "TikTok" },
                { icon: Linkedin, href: "https://www.linkedin.com/in/teenop-teen-opportunity-2b95593a8/", label: "LinkedIn" }
              ].map((social, i) => (
                <Link 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-[#434c9d] hover:text-white transition-all shadow-sm"
                >
                  <social.icon className="w-5 h-5" />
                </Link> 
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">For Teens</h4>
            <ul className="space-y-4">
              {[
                { label: "Start Earning", href: "/signup" },
                { label: "My Teen Hustle", href: "/my-teen-hustle" },
                { label: "Earnings", href: "/earnings" },
                { label: "Resources", href: "/blog" }
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-gray-600 font-bold hover:text-[#434c9d] transition-colors ml-1">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">For Neighbors</h4>
            <ul className="space-y-4">
              {[
                { label: "Find Services", href: "/neighborhood" },
                { label: "My Requests", href: "/my-requests" },
                { label: "Messages", href: "/messages" },
                { label: "Support", href: "/help" }
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-gray-600 font-bold hover:text-[#434c9d] transition-colors ml-1">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="lg:col-span-4 space-y-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Get in Touch</h4>
            <div className="bg-gray-50 rounded-[32px] p-6 space-y-4 border border-gray-100">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#96cbc3] shadow-sm group-hover:bg-[#96cbc3] group-hover:text-white transition-all">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-gray-600">teenop@gmail.com</span>
              </div>
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#434c9d] shadow-sm group-hover:bg-[#434c9d] group-hover:text-white transition-all">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-gray-600">San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              © {new Date().getFullYear()} TeenOp. Made with <Heart className="w-3 h-3 text-[#ff725a] fill-[#ff725a]" /> by the Team
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              {[
                { label: "Our Story", href: "/our-story" },
              ].map((link) => (
                <Link key={link.label} href={link.href} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-[#434c9d] transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

