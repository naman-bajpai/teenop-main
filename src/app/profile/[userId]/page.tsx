"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  ArrowLeft,
  MessageCircle,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { RatingDisplay } from "@/components/ui/rating";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  role: "teen" | "parent" | "admin";
  created_at: string | null;
  avatar_url: string | null;
  schedule_url: string | null;
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: navbarUser } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [rating, setRating] = React.useState<number>(0);
  const [reviewCount, setReviewCount] = React.useState<number>(0);
  const totalServices = React.useRef<number>(0);
  const totalBookings = React.useRef<number>(0);

  const userId = params.userId as string;
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
  const location = profile && (profile.city || profile.state) ? [profile.city, profile.state].filter(Boolean).join(", ") : "";

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone, city, state, bio, role, created_at, avatar_url, schedule_url")
          .eq("id", userId)
          .single();

        if (pErr) throw pErr;
        if (!p) throw new Error("Profile not found");
        setProfile(p as Profile);

        const { count: svcCount } = await supabase.from("services").select("*", { count: "exact", head: true }).eq("user_id", userId);
        totalServices.current = svcCount ?? 0;

        const { count: bookingCount } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("user_id", userId);
        totalBookings.current = bookingCount ?? 0;

        const { data: reviews } = await supabase.from("reviews").select("rating").eq("reviewee_id", userId);
        if (reviews && reviews.length > 0) {
          const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
          setRating(Math.round(avgRating * 10) / 10);
          setReviewCount(reviews.length);
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId, supabase]);

  if (loading) {
    return (
      <DashboardLayout user={navbarUser}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#434c9d] border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout user={navbarUser}>
        <div className="p-6 max-w-2xl mx-auto text-center">
          <p className="text-gray-500 mb-6">{error ?? "Profile not found."}</p>
          <Button onClick={() => router.back()} variant="outline" className="rounded-2xl">Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnProfile = navbarUser?.id === profile.id;

  return (
    <DashboardLayout user={navbarUser}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Button variant="ghost" onClick={() => router.back()} className="mb-8 rounded-xl text-gray-500 hover:text-gray-900 -ml-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Stats & Actions */}
          <div className="lg:col-span-4 space-y-8">
            <div className="text-center lg:text-left">
              <div className="inline-block relative mb-6">
                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[48px] overflow-hidden bg-white ring-8 ring-white shadow-2xl mx-auto lg:mx-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 flex items-center justify-center text-[#434c9d] text-5xl font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{name}</h1>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6">
                <Badge className="bg-[#434c9d]/10 text-[#434c9d] border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{profile.role}</Badge>
                {reviewCount > 0 && (
                  <Badge className="bg-yellow-50 text-yellow-700 border-none px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {rating.toFixed(1)}
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                {isOwnProfile ? (
                  <Button onClick={() => router.push("/profile")} className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl h-14 font-bold shadow-lg shadow-[#434c9d]/20">
                    Edit Your Profile
                  </Button>
                ) : (
                  <Button onClick={() => router.push(`/messages?user_id=${profile.id}`)} className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl h-14 font-bold shadow-lg shadow-[#434c9d]/20 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" /> Message {profile.first_name}
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{totalServices.current}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Services</div>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{totalBookings.current}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Bookings</div>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{reviewCount}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Reviews</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: About & Details */}
          <div className="lg:col-span-8 space-y-12">
            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">About</h2>
              <p className="text-xl text-gray-600 leading-relaxed font-medium">
                {profile.bio || `Hi, I'm ${profile.first_name}! I'm a ${profile.role} in ${location || "the area"} and I'm excited to help you out.`}
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Details</h2>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl"><MapPin className="w-5 h-5 text-[#96cbc3]" /></div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</div>
                      <div className="text-gray-900 font-bold">{location || "Not specified"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl"><Calendar className="w-5 h-5 text-[#434c9d]" /></div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Member Since</div>
                      <div className="text-gray-900 font-bold">
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {profile.role === "teen" && profile.schedule_url && (
                <section>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Availability</h2>
                  <Button 
                    variant="outline" 
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 font-bold text-gray-700 flex items-center justify-between px-6 hover:bg-gray-50 hover:border-gray-200 transition-all"
                    onClick={() => window.open(profile.schedule_url!, '_blank')}
                  >
                    <span className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#434c9d]" />
                      View Weekly Schedule
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-300" />
                  </Button>
                </section>
              )}
            </div>

            <section className="pt-8 border-t border-gray-100">
              <div className="bg-gradient-to-br from-[#434c9d] to-[#5a6bc4] rounded-[40px] p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10 max-w-md">
                  <h3 className="text-3xl font-bold mb-4">Need help with something?</h3>
                  <p className="text-white/80 mb-8 font-medium">Book one of {profile.first_name}&apos;s services or send a message to discuss your needs.</p>
                  <Button variant="secondary" onClick={() => router.push('/neighborhood')} className="bg-white text-[#434c9d] hover:bg-gray-100 rounded-2xl px-8 h-12 font-bold transition-all active:scale-95">
                    Browse Services
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
