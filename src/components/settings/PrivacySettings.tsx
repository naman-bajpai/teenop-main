"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Eye, EyeOff, Lock, Globe } from "lucide-react";

interface PrivacyPreferences {
  profile_visibility: "public" | "private" | "contacts_only";
  show_email: boolean;
  show_phone: boolean;
  show_location: boolean;
  show_services: boolean;
  show_ratings: boolean;
}

export default function PrivacySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    profile_visibility: "public",
    show_email: false,
    show_phone: false,
    show_location: true,
    show_services: true,
    show_ratings: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/preferences");
      const result = await response.json();

      if (result.success && result.preferences) {
        setPreferences({
          profile_visibility: result.preferences.profile_visibility || "public",
          show_email: result.preferences.show_email ?? false,
          show_phone: result.preferences.show_phone ?? false,
          show_location: result.preferences.show_location ?? true,
          show_services: result.preferences.show_services ?? true,
          show_ratings: result.preferences.show_ratings ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load privacy settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Privacy settings saved successfully",
        });
      } else {
        throw new Error(result.error || "Failed to save settings");
      }
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save privacy settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-4 h-4" />;
      case "private":
        return <Lock className="w-4 h-4" />;
      case "contacts_only":
        return <Eye className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "Anyone can view your profile and services";
      case "private":
        return "Only you can view your profile";
      case "contacts_only":
        return "Only users you've interacted with can view your profile";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy Settings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Control who can see your profile information and services
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Label htmlFor="profile-visibility" className="text-base font-medium text-gray-900 mb-2 block">
          Profile Visibility
        </Label>
        <p className="text-sm text-gray-500 mb-4">
          {getVisibilityDescription(preferences.profile_visibility)}
        </p>
        <Select
          value={preferences.profile_visibility}
          onValueChange={(value: "public" | "private" | "contacts_only") =>
            setPreferences((prev) => ({ ...prev, profile_visibility: value }))
          }
        >
          <SelectTrigger id="profile-visibility" className="w-full">
            <div className="flex items-center gap-2">
              {getVisibilityIcon(preferences.profile_visibility)}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Public</span>
              </div>
            </SelectItem>
            <SelectItem value="contacts_only">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>Contacts Only</span>
              </div>
            </SelectItem>
            <SelectItem value="private">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Private</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Information Visibility */}
      <div className="space-y-4">
        <h4 className="text-base font-semibold text-gray-900">Information Visibility</h4>
        <p className="text-sm text-gray-500 mb-4">
          Choose what information is visible on your profile
        </p>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="show-email" className="text-base font-medium text-gray-900 cursor-pointer">
              Email Address
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Show your email address on your profile
            </p>
          </div>
          <Checkbox
            id="show-email"
            checked={preferences.show_email}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                show_email: checked === true,
              }));
            }}
            disabled={preferences.profile_visibility === "private"}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="show-phone" className="text-base font-medium text-gray-900 cursor-pointer">
              Phone Number
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Show your phone number on your profile
            </p>
          </div>
          <Checkbox
            id="show-phone"
            checked={preferences.show_phone}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                show_phone: checked === true,
              }));
            }}
            disabled={preferences.profile_visibility === "private"}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="show-location" className="text-base font-medium text-gray-900 cursor-pointer">
              Location
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Show your city and state on your profile
            </p>
          </div>
          <Checkbox
            id="show-location"
            checked={preferences.show_location}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                show_location: checked === true,
              }));
            }}
            disabled={preferences.profile_visibility === "private"}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="show-services" className="text-base font-medium text-gray-900 cursor-pointer">
              Services
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Show your services on your profile
            </p>
          </div>
          <Checkbox
            id="show-services"
            checked={preferences.show_services}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                show_services: checked === true,
              }));
            }}
            disabled={preferences.profile_visibility === "private"}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="show-ratings" className="text-base font-medium text-gray-900 cursor-pointer">
              Ratings & Reviews
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Show your ratings and reviews on your profile
            </p>
          </div>
          <Checkbox
            id="show-ratings"
            checked={preferences.show_ratings}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                show_ratings: checked === true,
              }));
            }}
            disabled={preferences.profile_visibility === "private"}
            className="ml-4"
          />
        </div>
      </div>

      {/* Info Box */}
      {preferences.profile_visibility === "private" && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> When your profile is set to private, all information visibility options are automatically disabled.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

