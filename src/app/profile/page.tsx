"use client";
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Edit,
  Save,
  X,
  Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";


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
  updated_at?: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const { user: navbarUser } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  // Derived UI fields
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
  const location =
    profile && (profile.city || profile.state)
      ? [profile.city, profile.state].filter(Boolean).join(", ")
      : "";
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  // You can compute these properly later (e.g., from reviews/services)
  const rating = 4.8;
  const totalServices = React.useRef<number>(0);
  const totalBookings = React.useRef<number>(0);

  // Editing draft state
  const [draft, setDraft] = React.useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    bio: string;
  }>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    bio: "",
  });

  // Load profile (+ optional counts)
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user: authUser },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!authUser) {
          setError("Not signed in");
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, email, phone, city, state, bio, role, created_at, avatar_url"
          )
          .eq("id", authUser.id)
          .single();

        if (pErr) throw pErr;
        if (!p) throw new Error("Profile not found");

        const profileData = p as Profile;
        setProfile(profileData);
        setDraft({
          first_name: profileData.first_name ?? "",
          last_name: profileData.last_name ?? "",
          email: profileData.email ?? "",
          phone: profileData.phone ?? "",
          city: profileData.city ?? "",
          state: profileData.state ?? "",
          bio: profileData.bio ?? "",
        });

        // Optional: count services created by this user (if you created `services`)
        const { count: svcCount } = await supabase
          .from("services")
          .select("*", { count: "exact", head: true })
          .eq("user_id", authUser.id);
        totalServices.current = svcCount ?? 0;

        // TODO: replace with real bookings count when you add a bookings table
        totalBookings.current = 0;
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const update = {
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        // allow email edit only if you want it to be source of truth (you may prefer read-only)
        email: draft.email.trim(),
        phone: draft.phone.trim() || null,
        city: draft.city.trim() || null,
        state: draft.state.trim() || null,
        bio: draft.bio.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Use a more direct approach to avoid TypeScript issues
      const { data, error: upErr } = await (supabase as any)
        .from("profiles")
        .update(update) 
        .eq("id", profile.id)
        .select()
        .single();

      if (upErr) throw upErr;

      setProfile(data as Profile);
      setIsEditing(false);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setDraft({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      bio: profile.bio ?? "",
    });
    setIsEditing(false);
  };

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
            <p className="text-gray-600">{error ?? "Profile not found."}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={{
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        name,
        email: profile.email,
        role: profile.role,
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
              <p className="text-gray-600">Manage your account settings and preferences</p>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {(profile.first_name || name).charAt(0).toUpperCase()}
                  </div>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                      // TODO: wire to an avatar upload flow
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        value={draft.first_name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, first_name: e.target.value }))
                        }
                        placeholder="First name"
                      />
                      <Input
                        value={draft.last_name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, last_name: e.target.value }))
                        }
                        placeholder="Last name"
                      />
                    </div>
                  ) : (
                    name || profile.email
                  )}
                </h2>
                <Badge className="mb-4 capitalize">{profile.role}</Badge>

                <div className="flex items-center justify-center gap-1 mb-4">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-900">{rating}</span>
                  <span className="text-sm text-gray-500">(24 reviews)</span>
                </div>

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
                  {isEditing ? (
                    <Input
                      value={draft.email}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, email: e.target.value }))
                      }
                    />
                  ) : (
                    <p className="text-gray-900">{profile.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <Input
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, phone: e.target.value }))
                      }
                    />
                  ) : (
                    <p className="text-gray-900">{profile.phone || "-"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Location
                  </label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        value={draft.city}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, city: e.target.value }))
                        }
                        placeholder="City"
                      />
                      <Input
                        value={draft.state}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, state: e.target.value }))
                        }
                        placeholder="State"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900">{location || "-"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Member Since
                  </label>
                  <p className="text-gray-900">{joinDate || "-"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={draft.bio}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, bio: e.target.value }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.bio || "-"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Settings (placeholder actions) */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Account Settings
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-600">
                      Receive updates about bookings and messages
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">Privacy Settings</h4>
                    <p className="text-sm text-gray-600">
                      Control who can see your profile and services
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">Payment Methods</h4>
                    <p className="text-sm text-gray-600">
                      Manage your payment and payout settings
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </DashboardLayout>
  );
}
