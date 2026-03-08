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
  Settings,
  Bell,
  Lock,
  Briefcase,
  Wallet,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EmailNotificationSettings from "@/components/settings/EmailNotificationSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
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
  updated_at?: string | null;
  avatar_url: string | null;
  schedule_url: string | null;
};

export default function ProfilePage() {
  const { user: navbarUser } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = React.useState(false);
  const [isPrivacySettingsOpen, setIsPrivacySettingsOpen] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
  const location = profile && (profile.city || profile.state) ? [profile.city, profile.state].filter(Boolean).join(", ") : "";
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleString("en-US", { month: "long", year: "numeric" }) : "";
  const isParent = profile?.role === "parent";
  const isTeen = profile?.role === "teen";

  const [rating, setRating] = React.useState<number>(0);
  const [reviewCount, setReviewCount] = React.useState<number>(0);
  const totalServices = React.useRef<number>(0);
  const totalBookings = React.useRef<number>(0);

  const [draft, setDraft] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    bio: "",
  });

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!authUser) {
          setError("Not signed in");
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone, city, state, bio, role, created_at, avatar_url, schedule_url")
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

        const { count: svcCount } = await supabase.from("services").select("*", { count: "exact", head: true }).eq("user_id", authUser.id);
        totalServices.current = svcCount ?? 0;

        const { count: bookingCount } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("user_id", authUser.id);
        totalBookings.current = bookingCount ?? 0;

        // Reviews received by this user (as reviewee) — from parents/customers
        const { data: reviews } = await supabase.from("reviews").select("rating").eq("reviewee_id", authUser.id);
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
        email: draft.email.trim(),
        phone: draft.phone.trim() || null,
        city: draft.city.trim() || null,
        state: draft.state.trim() || null,
        bio: draft.bio.trim() || null,
        updated_at: new Date().toISOString(),
      };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    setUploadingAvatar(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/profile/upload-avatar', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to upload avatar');
      if (profile) setProfile({ ...profile, avatar_url: result.avatar_url });
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setError(err.message || 'Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#434c9d] border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout user={navbarUser}>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-medium">{error ?? "Profile not found."}</p>
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm mb-8 relative">
          <div className="h-40 bg-gradient-to-r from-[#434c9d] via-[#5a6bc4] to-[#96cbc3] relative">
            <div className="absolute inset-0 bg-black/5" />
          </div>
          
          <div className="px-8 pb-8">
            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-6 gap-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                <div className="relative group mx-auto sm:mx-0">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[40px] overflow-hidden bg-white ring-[6px] ring-white shadow-xl relative">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 flex items-center justify-center text-[#434c9d] text-4xl font-bold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                          {uploadingAvatar ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Camera className="w-6 h-6" />}
                        </Button>
                      </div>
                    )}
                  </div>
                  {isEditing && !uploadingAvatar && (
                    <div className="absolute -bottom-1 -right-1 bg-[#434c9d] text-white p-2 rounded-2xl shadow-lg sm:hidden">
                      <Camera className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left pb-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                    <h1 className="page-title text-gray-900">{name}</h1>
                    <Badge className="bg-[#434c9d]/10 text-[#434c9d] border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{profile.role}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm font-medium text-gray-500">
                    <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#96cbc3]" />{location || "Location not set"}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#434c9d]" />Joined {joinDate}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-3 pb-2">
                {isEditing ? (
                  <>
                    <Button variant="ghost" onClick={handleCancel} disabled={saving} className="rounded-2xl px-6 font-semibold hover:bg-gray-50">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl px-8 font-semibold shadow-lg shadow-[#434c9d]/20 transition-all active:scale-95">
                      {saving ? "Saving..." : "Save Profile"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className="bg-white border-gray-100 text-gray-900 hover:bg-gray-50 rounded-2xl px-6 font-semibold shadow-sm flex items-center gap-2">
                    <Edit className="w-4 h-4" /> Edit Profile
                  </Button>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-50 w-full mb-8" />

            <div
              className={cn(
                "grid gap-4",
                isParent ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
              )}
            >
              {isParent ? (
                <>
                  <div className="bg-gray-50/50 rounded-2xl p-4 text-center border border-gray-50">
                    <div className="text-2xl font-bold text-gray-900">{totalBookings.current}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Services booked on TeenOp
                    </div>
                  </div>
                  <div className="bg-gray-50/50 rounded-2xl p-4 text-center border border-gray-50 col-span-2 sm:col-span-2 flex items-center justify-center gap-4">
                    <div className="text-left">
                      <div className="text-2xl font-bold text-gray-900">{rating.toFixed(1)}</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Avg Rating</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <RatingDisplay rating={rating} size="sm" showCount={false} />
                      <span className="text-[10px] font-bold text-[#96cbc3] mt-1 uppercase tracking-tight">
                        {reviewCount} Reviews
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-50/50 rounded-2xl p-4 text-center border border-gray-50">
                    <div className="text-2xl font-bold text-gray-900">{totalServices.current}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Services</div>
                  </div>
                  <div className="bg-gray-50/50 rounded-2xl p-4 text-center border border-gray-50">
                    <div className="text-2xl font-bold text-gray-900">{totalBookings.current}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Bookings</div>
                  </div>
                  <div className="bg-gray-50/50 rounded-2xl p-4 text-center border border-gray-50 col-span-2 sm:col-span-2 flex items-center justify-center gap-4">
                    <div className="text-left">
                      <div className="text-2xl font-bold text-gray-900">{rating.toFixed(1)}</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Avg Rating</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <RatingDisplay rating={rating} size="sm" showCount={false} />
                      <span className="text-[10px] font-bold text-[#96cbc3] mt-1 uppercase tracking-tight">
                        {reviewCount} Reviews
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-[#434c9d]/10 rounded-xl"><User className="w-5 h-5 text-[#434c9d]" /></div>
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                  {isEditing ? <Input value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} className="rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white" /> : <p className="p-3 bg-gray-50/30 rounded-xl text-gray-900 font-medium">{profile.first_name || "-"}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                  {isEditing ? <Input value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} className="rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white" /> : <p className="p-3 bg-gray-50/30 rounded-xl text-gray-900 font-medium">{profile.last_name || "-"}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                  {isEditing ? <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white" /> : <p className="p-3 bg-gray-50/30 rounded-xl text-gray-900 font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{profile.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                  {isEditing ? <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white" /> : <p className="p-3 bg-gray-50/30 rounded-xl text-gray-900 font-medium flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{profile.phone || "-"}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">City</label>
                  {isEditing ? <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="e.g. Austin" className="rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white" /> : <p className="p-3 bg-gray-50/30 rounded-xl text-gray-900 font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{profile.city || "-"}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">State</label>
                  {isEditing ? <Input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} placeholder="e.g. TX" className="rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white" /> : <p className="p-3 bg-gray-50/30 rounded-xl text-gray-900 font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{profile.state || "-"}</p>}
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bio</label>
                  {isEditing ? <textarea value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} className="w-full rounded-xl bg-gray-50/50 border border-gray-100 p-4 min-h-[120px] focus:bg-white focus:ring-2 focus:ring-[#434c9d]/5 outline-none transition-all" /> : <p className="p-4 bg-gray-50/30 rounded-xl text-gray-900 font-medium leading-relaxed">{profile.bio || "No bio set yet."}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-8">
                <div className="p-2 bg-[#96cbc3]/10 rounded-xl"><Settings className="w-5 h-5 text-[#96cbc3]" /></div>
                Account
              </h3>
              
              <div className="space-y-4">
                <Dialog open={isEmailSettingsOpen} onOpenChange={setIsEmailSettingsOpen}>
                  <DialogTrigger asChild>
                    <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all text-left group">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors"><Bell className="w-4 h-4 text-gray-500" /></div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900">Notifications</div>
                        <div className="text-xs text-gray-500">Email and push alerts</div>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl border-none rounded-[32px] p-0 overflow-hidden">
                    <div className="p-8 bg-[#434c9d] text-white">
                      <DialogTitle className="text-2xl font-bold">Notification Settings</DialogTitle>
                      <DialogDescription className="text-[#434c9d]/20 text-white/70">Customize how you receive updates</DialogDescription>
                    </div>
                    <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <EmailNotificationSettings />
                    </div>
                  </DialogContent>
                </Dialog>

                {isTeen && (
                  <Dialog open={isPrivacySettingsOpen} onOpenChange={setIsPrivacySettingsOpen}>
                    <DialogTrigger asChild>
                      <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all text-left group">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors"><Lock className="w-4 h-4 text-gray-500" /></div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gray-900">Privacy</div>
                          <div className="text-xs text-gray-500">Storefront visibility</div>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl border-none rounded-[32px] p-0 overflow-hidden">
                      <div className="p-8 bg-[#96cbc3] text-white">
                        <DialogTitle className="text-2xl font-bold">Privacy Settings</DialogTitle>
                        <DialogDescription className="text-white/70">Control who can see your profile</DialogDescription>
                      </div>
                      <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <PrivacySettings />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {profile?.role === "teen" && (
                  <>
                    <button onClick={() => window.location.href = "/my-teen-hustle"} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all text-left group">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors"><Briefcase className="w-4 h-4 text-gray-500" /></div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900">Teen Hustle</div>
                        <div className="text-xs text-gray-500">Manage your services</div>
                      </div>
                    </button>
                    <button onClick={() => window.location.href = "/earnings"} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all text-left group">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors"><Wallet className="w-4 h-4 text-gray-500" /></div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900">Payments</div>
                        <div className="text-xs text-gray-500">Payouts and methods</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div> 
    </DashboardLayout>
  );
}
