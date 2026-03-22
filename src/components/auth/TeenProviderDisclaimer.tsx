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
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 border-b border-slate-100 px-6 pt-6 text-2xl font-bold text-slate-900 sm:px-8">
            <span className="rounded-2xl bg-[#434c9d]/10 p-2 text-[#434c9d]">
              <Shield className="h-5 w-5" />
            </span>
            Teen Provider Disclaimer
          </DialogTitle>
          <DialogDescription className="px-6 pb-2 pt-3 text-base text-slate-500 sm:px-8">
            Please read and check each box before using TeenOp. This is the last step in creating your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-4 sm:px-8">
          {/* Accept All Toggle */}
          <div className="flex items-center space-x-3 rounded-2xl border border-[#434c9d]/15 bg-[#434c9d]/5 p-4">
            <Checkbox
              id="accept-all"
              checked={allAccepted}
              onCheckedChange={handleAcceptAll}
              className="data-[state=checked]:bg-[#434c9d] data-[state=checked]:border-[#434c9d]"
            />
            <label
              htmlFor="accept-all"
              className="cursor-pointer text-sm font-semibold text-[#434c9d]"
            >
              Accept All Terms
            </label>
          </div>

          {/* Individual Items */}
          <div className="space-y-4">
            {disclaimerItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start space-x-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
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
                    className="flex-1 cursor-pointer text-sm leading-relaxed text-slate-700"
                  >
                    {item.text}
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Warning Notice */}
          <div className="rounded-2xl border border-[#ff725a]/20 bg-[#ff725a]/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#ff725a]" />
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

        <DialogFooter className="flex-col gap-3 border-t border-slate-100 px-6 py-6 sm:flex-row sm:px-8">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allAccepted}
            className="w-full rounded-2xl bg-[#E8634A] text-white hover:bg-[#d45539] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {allAccepted ? "Accept & Continue" : `Accept ${acceptedItems.size} of ${disclaimerItems.length} terms`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
