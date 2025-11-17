"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Loader2 } from "lucide-react";

interface EmailPreferences {
  email_notifications_enabled: boolean;
  email_booking_confirmations: boolean;
  email_booking_reminders: boolean;
  email_quote_updates: boolean;
  email_messages: boolean;
  email_marketing: boolean;
}

export default function EmailNotificationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences>({
    email_notifications_enabled: true,
    email_booking_confirmations: true,
    email_booking_reminders: true,
    email_quote_updates: true,
    email_messages: true,
    email_marketing: false,
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
          email_notifications_enabled: result.preferences.email_notifications_enabled ?? true,
          email_booking_confirmations: result.preferences.email_booking_confirmations ?? true,
          email_booking_reminders: result.preferences.email_booking_reminders ?? true,
          email_quote_updates: result.preferences.email_quote_updates ?? true,
          email_messages: result.preferences.email_messages ?? true,
          email_marketing: result.preferences.email_marketing ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load email notification settings",
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
          description: "Email notification settings saved successfully",
        });
      } else {
        throw new Error(result.error || "Failed to save settings");
      }
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save email notification settings",
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Notifications</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose which email notifications you want to receive
        </p>
      </div>

      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex-1">
          <Label htmlFor="master-toggle" className="text-base font-medium text-gray-900 cursor-pointer">
            Enable Email Notifications
          </Label>
          <p className="text-sm text-gray-500 mt-1">
            Master switch for all email notifications. When disabled, you won't receive any emails.
          </p>
        </div>
        <Checkbox
          id="master-toggle"
          checked={preferences.email_notifications_enabled}
          onCheckedChange={(checked) => {
            setPreferences((prev) => ({
              ...prev,
              email_notifications_enabled: checked === true,
            }));
          }}
          className="ml-4"
        />
      </div>

      {/* Individual Notification Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="booking-confirmations" className="text-base font-medium text-gray-900 cursor-pointer">
              Booking Confirmations
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Receive emails when bookings are confirmed, accepted, or rejected
            </p>
          </div>
          <Checkbox
            id="booking-confirmations"
            checked={preferences.email_booking_confirmations}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                email_booking_confirmations: checked === true,
              }));
            }}
            disabled={!preferences.email_notifications_enabled}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="booking-reminders" className="text-base font-medium text-gray-900 cursor-pointer">
              Booking Reminders
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Receive reminder emails before your scheduled bookings (24 hours, 3 hours, 1 hour)
            </p>
          </div>
          <Checkbox
            id="booking-reminders"
            checked={preferences.email_booking_reminders}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                email_booking_reminders: checked === true,
              }));
            }}
            disabled={!preferences.email_notifications_enabled}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="quote-updates" className="text-base font-medium text-gray-900 cursor-pointer">
              Quote Updates
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Receive emails about quote requests, new quotes, and quote acceptances
            </p>
          </div>
          <Checkbox
            id="quote-updates"
            checked={preferences.email_quote_updates}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                email_quote_updates: checked === true,
              }));
            }}
            disabled={!preferences.email_notifications_enabled}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="messages" className="text-base font-medium text-gray-900 cursor-pointer">
              Messages
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Receive email notifications when you receive new messages
            </p>
          </div>
          <Checkbox
            id="messages"
            checked={preferences.email_messages}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                email_messages: checked === true,
              }));
            }}
            disabled={!preferences.email_notifications_enabled}
            className="ml-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="marketing" className="text-base font-medium text-gray-900 cursor-pointer">
              Marketing & Promotions
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Receive emails about new features, tips, and promotional offers
            </p>
          </div>
          <Checkbox
            id="marketing"
            checked={preferences.email_marketing}
            onCheckedChange={(checked) => {
              setPreferences((prev) => ({
                ...prev,
                email_marketing: checked === true,
              }));
            }}
            disabled={!preferences.email_notifications_enabled}
            className="ml-4"
          />
        </div>
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

