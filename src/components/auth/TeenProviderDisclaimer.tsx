"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Shield, Users, MessageSquare, Home, AlertCircle } from "lucide-react";

interface TeenProviderDisclaimerProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const disclaimerItems = [
  {
    id: "employment",
    text: "I understand that TeenOp connects me with buyers but does not employ, supervise, or guarantee my services.",
    icon: <Users className="w-5 h-5 text-[#434c9d]" />
  },
  {
    id: "communication",
    text: "I agree to provide services responsibly and communicate only through TeenOp.",
    icon: <MessageSquare className="w-5 h-5 text-[#434c9d]" />
  },
  {
    id: "conduct",
    text: "I will treat all buyers respectfully and follow TeenOp's safety and conduct rules.",
    icon: <Shield className="w-5 h-5 text-[#434c9d]" />
  },
  {
    id: "safety",
    text: "I understand that in-person services must take place safely and with parent or guardian awareness.",
    icon: <Home className="w-5 h-5 text-[#434c9d]" />
  },
  {
    id: "liability",
    text: "I acknowledge that TeenOp is not liable for any losses, damages, or disputes related to my services.",
    icon: <AlertCircle className="w-5 h-5 text-[#434c9d]" />
  },
  {
    id: "personal_safety",
    text: "I understand that I am responsible for my own safety while offering services, and TeenOp is not liable for any injuries, accidents, or damages that occur during or because of my services.",
    icon: <AlertTriangle className="w-5 h-5 text-[#ff725a]" />
  }
];

export default function TeenProviderDisclaimer({ isOpen, onClose, onAccept }: TeenProviderDisclaimerProps) {
  const [acceptedItems, setAcceptedItems] = useState<Set<string>>(new Set());
  const [allAccepted, setAllAccepted] = useState(false);

  const handleItemToggle = (itemId: string) => {
    const newAccepted = new Set(acceptedItems);
    if (newAccepted.has(itemId)) {
      newAccepted.delete(itemId);
    } else {
      newAccepted.add(itemId);
    }
    setAcceptedItems(newAccepted);
    setAllAccepted(newAccepted.size === disclaimerItems.length);
  };

  const handleAcceptAll = () => {
    if (allAccepted) {
      setAcceptedItems(new Set());
      setAllAccepted(false);
    } else {
      setAcceptedItems(new Set(disclaimerItems.map(item => item.id)));
      setAllAccepted(true);
    }
  };

  const handleSubmit = () => {
    if (allAccepted) {
      onAccept();
      // Reset state
      setAcceptedItems(new Set());
      setAllAccepted(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#434c9d] flex items-center gap-3">
            <Shield className="w-6 h-6" />
            Teen Provider Disclaimer
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 mt-2">
            Please read and check each box before using TeenOp. This is the last step in creating your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Accept All Toggle */}
          <div className="flex items-center space-x-3 p-4 bg-[#96cbc3]/10 rounded-lg border border-[#96cbc3]/20">
            <Checkbox
              id="accept-all"
              checked={allAccepted}
              onCheckedChange={handleAcceptAll}
              className="data-[state=checked]:bg-[#434c9d] data-[state=checked]:border-[#434c9d]"
            />
            <label
              htmlFor="accept-all"
              className="text-sm font-semibold text-[#434c9d] cursor-pointer"
            >
              Accept All Terms
            </label>
          </div>

          {/* Individual Items */}
          <div className="space-y-4">
            {disclaimerItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <Checkbox
                  id={item.id}
                  checked={acceptedItems.has(item.id)}
                  onCheckedChange={() => handleItemToggle(item.id)}
                  className="mt-0.5 data-[state=checked]:bg-[#434c9d] data-[state=checked]:border-[#434c9d]"
                />
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {item.icon}
                  </div>
                  <label
                    htmlFor={item.id}
                    className="text-sm text-gray-700 leading-relaxed cursor-pointer flex-1"
                  >
                    {item.text}
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Warning Notice */}
          <div className="p-4 bg-[#ff725a]/10 border border-[#ff725a]/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ff725a] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#ff725a]">
                <p className="font-semibold mb-1">Important Notice</p>
                <p>
                  By accepting these terms, you acknowledge that you understand your responsibilities as a teen service provider on TeenOp. 
                  Please ensure you have discussed this with your parent or guardian before proceeding.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allAccepted}
            className="w-full sm:w-auto bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allAccepted ? "Accept & Continue" : `Accept ${acceptedItems.size} of ${disclaimerItems.length} terms`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
