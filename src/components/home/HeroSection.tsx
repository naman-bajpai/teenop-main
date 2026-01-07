import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, Star, TrendingUp, ArrowRight, Shield, Sparkles } from "lucide-react";

interface User { id: string; name?: string; email?: string; role?: string; }
interface HeroSectionProps { user: User | null | undefined; }

export default function HeroSection({ user }: HeroSectionProps) {
  return (
    <section id="hero" className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-950 -mt-17 pt-17">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Background image */}
        <div
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/dog.png')" }}
          aria-hidden
        />
        
        {/* Original brand color overlay + vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#434c9d]/30 via-[#434c9d]/20 to-slate-950/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,.25),transparent_60%)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-[1.8fr_1fr] xl:grid-cols-[2fr_1fr] gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-[#96cbc3]" />
              <span>Empowering Young Entrepreneurs</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
                <span className="block">Welcome to</span>
                <span className="block bg-gradient-to-r from-[#96cbc3] via-white to-[#96cbc3] bg-clip-text text-transparent animate-gradient">
                  {user ? "TeenOp" : "Your Neighborhood"}
                </span>
              </h1>
              
              {!user && (
                <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
                  Find Help in Your Community
                </h2>
              )}
            </div>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {user
                ? "Discover amazing services by talented teens near you, or start your own teen hustle and turn your skills into income."
                : "Connecting talented teens with their community. Find trusted services or start earning today."}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link href="/neighborhood">
                <Button 
                  size="lg"
                  className="group relative h-14 px-8 text-base bg-white text-[#434c9d] hover:bg-white/95 shadow-2xl hover:shadow-[#96cbc3]/20 hover:scale-105 transition-all duration-300 rounded-xl font-semibold overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Browse Services
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#96cbc3]/0 via-[#96cbc3]/10 to-[#96cbc3]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </Link>
              
              {user && user.role === "teen" && (
                <Link href="/my-teen-hustle">
                  <Button 
                    size="lg"
                    className="group relative h-14 px-8 text-base bg-gradient-to-r from-[#ff725a] to-[#ff8a6b] hover:from-[#ff725a]/90 hover:to-[#ff8a6b]/90 text-white shadow-2xl hover:shadow-[#ff725a]/30 hover:scale-105 transition-all duration-300 rounded-xl font-semibold overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Start Earning
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start pt-4 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#96cbc3]" />
                <span>Verified Teens</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span>5-Star Rated</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#96cbc3]" />
                <span>Community Trusted</span>
              </div>
            </div>
          </div>

          {/* Right Column - Feature Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-6 lg:gap-4 max-w-sm lg:ml-auto">
            {/* Trusted Teens Card */}
            <div className="group relative rounded-2xl bg-white/10 backdrop-blur-xl p-6 border border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#96cbc3]/30 to-[#434c9d]/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-[#96cbc3]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Trusted Teens</h3>
                <p className="text-sm text-white/80 leading-relaxed">Verified young entrepreneurs in your community</p>
              </div>
            </div>

            {/* Quality Service Card */}
            <div className="group relative rounded-2xl bg-white/10 backdrop-blur-xl p-6 border border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-amber-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Star className="w-7 h-7 text-amber-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Quality Service</h3>
                <p className="text-sm text-white/80 leading-relaxed">Rated and reviewed by real customers</p>
              </div>
            </div>

            {/* Fair Prices Card */}
            <div className="group relative rounded-2xl bg-white/10 backdrop-blur-xl p-6 border border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer sm:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#96cbc3]/30 to-[#434c9d]/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-7 h-7 text-[#96cbc3]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fair Prices</h3>
                <p className="text-sm text-white/80 leading-relaxed">Affordable rates that work for everyone</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
