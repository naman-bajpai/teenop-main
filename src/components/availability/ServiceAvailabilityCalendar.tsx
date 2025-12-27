"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Save, X, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TimeSlot {
  start: string;
  end: string;
}

interface Availability {
  [key: string]: TimeSlot[];
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

interface ServiceAvailabilityCalendarProps {
  serviceId?: string;
  initialAvailability?: Availability;
  readOnly?: boolean;
  onSave?: (availability: Availability) => void;
}

export default function ServiceAvailabilityCalendar({
  serviceId,
  initialAvailability,
  readOnly = false,
  onSave,
}: ServiceAvailabilityCalendarProps) {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<Availability>(initialAvailability || {});
  const [loading, setLoading] = useState(!!serviceId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serviceId && !initialAvailability) {
      fetchAvailability();
    } else if (initialAvailability) {
      setAvailability(initialAvailability);
      setLoading(false);
    } else {
      // Initialize with empty slots for each day
      const emptyAvailability: Availability = {};
      DAYS_OF_WEEK.forEach((day) => {
        emptyAvailability[day.key] = [];
      });
      setAvailability(emptyAvailability);
      setLoading(false);
    }
  }, [serviceId, initialAvailability]);

  const fetchAvailability = async () => {
    if (!serviceId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/services/${serviceId}/availability`);
      const result = await response.json();

      if (result.success && result.availability) {
        setAvailability(result.availability || {});
      } else {
        // Initialize with empty slots for each day
        const emptyAvailability: Availability = {};
        DAYS_OF_WEEK.forEach((day) => {
          emptyAvailability[day.key] = [];
        });
        setAvailability(emptyAvailability);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "09:00", end: "17:00" }],
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const updateTimeSlot = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const handleSave = async () => {
    if (readOnly) return;

    try {
      setSaving(true);
      
      if (serviceId) {
        // Save to service
        const response = await fetch(`/api/services/${serviceId}/availability`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            availability,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to save availability");
        }

        toast({
          title: "Success",
          description: "Service availability saved successfully",
        });
      }

      if (onSave) {
        onSave(availability);
      }
    } catch (error: any) {
      console.error("Error saving availability:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save availability",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Initialize empty availability for days that don't have any slots
  const initializedAvailability: Availability = {};
  DAYS_OF_WEEK.forEach((day) => {
    initializedAvailability[day.key] = availability[day.key] || [];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Service Availability
        </h3>
        {!readOnly && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => {
          const slots = initializedAvailability[day.key] || [];
          return (
            <Card key={day.key} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{day.label}</h4>
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(day.key)}
                    className="h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Time
                  </Button>
                )}
              </div>

              {slots.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  {readOnly ? "No availability set" : "Click 'Add Time' to set availability"}
                </p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) =>
                          updateTimeSlot(day.key, index, "start", e.target.value)
                        }
                        disabled={readOnly}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) =>
                          updateTimeSlot(day.key, index, "end", e.target.value)
                        }
                        disabled={readOnly}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(day.key, index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

