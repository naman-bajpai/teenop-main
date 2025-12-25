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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { RatingDisplay } from "@/components/ui/rating";

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

  // Derived UI fields
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
  const location =
    profile && (profile.city || profile.state)
      ? [profile.city, profile.state].filter(Boolean).join(", ")
      : "";

  // Load profile
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, email, phone, city, state, bio, role, created_at, avatar_url, schedule_url"
          )
          .eq("id", userId)
          .single();

        if (pErr) throw pErr;
        if (!p) throw new Error("Profile not found");

        const profileData = p as Profile;
        setProfile(profileData);

        // Count services created by this user
        const { count: svcCount } = await supabase
          .from("services")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        totalServices.current = svcCount ?? 0;

        // Count bookings for this user
        const { count: bookingCount } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        totalBookings.current = bookingCount ?? 0;

        // Get average rating from reviews
        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("reviewee_id", userId);

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

    if (userId) {
      load();
    }
  }, [userId, supabase]);

  if (loading) {
    return (
      <DashboardLayout user={navbarUser}>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading profile…</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout user={navbarUser}>
        <div className="p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">{error ?? "Profile not found."}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnProfile = navbarUser?.id === profile.id;

  return (
    <DashboardLayout user={navbarUser}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
              <p className="text-gray-600">
                {isOwnProfile ? "Manage your account settings and preferences" : "View profile"}
              </p>
            </div>
            {isOwnProfile && (
              <Button onClick={() => router.push("/profile")}>
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={name || "Profile"}
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {(profile.first_name || name).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {name || profile.email}
                </h2>
                <Badge className="mb-4 capitalize">{profile.role}</Badge>

                {reviewCount > 0 && (
                  <div className="flex items-center justify-center gap-1 mb-4">
                    <RatingDisplay rating={rating} size="sm" showCount={false} />
                    <span className="text-sm font-medium text-gray-900">{rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({reviewCount} reviews)</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalServices.current}
                    </p>
                    <p className="text-sm text-gray-600">Services</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalBookings.current}
                    </p>
                    <p className="text-sm text-gray-600">Bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Profile Information
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address
                  </label>
                  <p className="text-gray-900">{profile.email}</p>
                </div>

                {profile.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    <p className="text-gray-900">{profile.phone}</p>
                  </div>
                )}

                {location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location
                    </label>
                    <p className="text-gray-900">{location}</p>
                  </div>
                )}

                {profile.bio && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <p className="text-gray-900 whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                )}

                {profile.created_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Member Since
                    </label>
                    <p className="text-gray-900">
                      {new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

