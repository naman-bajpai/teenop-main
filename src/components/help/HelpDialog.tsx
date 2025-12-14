"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { HelpCircle, Send, Loader2 } from "lucide-react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId?: string;
  serviceTitle?: string;
}

export default function HelpDialog({
  isOpen,
  onClose,
  serviceId,
  serviceTitle,
}: HelpDialogProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Fetch admin ID when dialog opens
      fetch("/api/admin/get")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.admin) {
            setAdminId(data.admin.id);
          }
        })
        .catch((error) => {
          console.error("Error fetching admin:", error);
        });
    } else {
      // Reset form when dialog closes
      setMessage("");
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter your question or issue.",
        variant: "destructive",
      });
      return;
    }

    if (!adminId) {
      toast({
        title: "Error",
        description: "Unable to connect to support. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      const response = await fetch("/api/messages/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: serviceId || null,
          content: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      toast({
        title: "Message sent!",
        description: "Your help request has been sent to our support team. We'll get back to you soon.",
      });

      setMessage("");
      onClose();
    } catch (error: any) {
      console.error("Error sending help message:", error);
      toast({
        title: "Failed to send",
        description: error.message || "Unable to send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#434c9d]" />
            Get Help
          </DialogTitle>
          <DialogDescription>
            {serviceTitle
              ? `Need help with "${serviceTitle}"? Send us a message and we'll assist you.`
              : "Have a question or need assistance? Send us a message and we'll help you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="help-message">Your Message</Label>
            <Textarea
              id="help-message"
              placeholder="Describe your question or issue..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="bg-[#434c9d] hover:bg-[#434c9d]/90 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
