"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Lock, Globe } from "lucide-react";

interface PrivacyPreferences {
  profile_visibility: "public" | "private";
}

export default function PrivacySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    profile_visibility: "public",
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
        const visibility = result.preferences.profile_visibility;
        setPreferences({
          profile_visibility: visibility === "private" ? "private" : "public",
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
          Control who can discover and view your storefront
        </p>
      </div>

      {/* Storefront Visibility */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Label htmlFor="profile-visibility" className="text-base font-medium text-gray-900 mb-2 block">
          Storefront Visibility
        </Label>
        <p className="text-sm text-gray-500 mb-4">
          {preferences.profile_visibility === "public"
            ? "Visible to all users on TeenOp"
            : "Only visible to members of your school community"}
        </p>
        <Select
          value={preferences.profile_visibility}
          onValueChange={(value: "public" | "private") =>
            setPreferences((prev) => ({ ...prev, profile_visibility: value }))
          }
        >
          <SelectTrigger id="profile-visibility" className="w-full">
            <div className="flex items-center gap-2">
              {preferences.profile_visibility === "public"
                ? <Globe className="w-4 h-4" />
                : <Lock className="w-4 h-4" />}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Public (visible to all users on TeenOp)</span>
              </div>
            </SelectItem>
            <SelectItem value="private">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Private (only visible to members of your school community)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

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

