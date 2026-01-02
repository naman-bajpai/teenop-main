"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Send, MessageCircle, User, ExternalLink, Image as ImageIcon, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  booking_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  sender_name: string;
}

interface MessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  bookingId: string;
}

export default function MessageDialog({
  isOpen,
  onClose,
  bookingId,
  recipientId,
  recipientName,
}: MessageDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setCurrentUserId(data.user.id);
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchMessages();
    }
  }, [isOpen, bookingId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages?booking_id=${bookingId}`, {
        cache: "no-store"
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    try {
      setSending(true);
      let imageUrl = null;

      if (selectedImage) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('booking_id', bookingId);

        const uploadResponse = await fetch("/api/messages/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload image");
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
        setUploadingImage(false);
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: bookingId,
          receiver_id: recipientId,
          content: newMessage.trim() || null,
          image_url: imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage("");
        removeImage();
        toast({
          title: "Message sent",
          description: "Your message has been sent successfully.",
        });
        
        window.dispatchEvent(new CustomEvent('messageSent', {
          detail: {
            bookingId,
            message: data.message
          }
        }));
      }
    } catch (error: any) {
      setUploadingImage(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      removeImage();
    }
  }, [isOpen]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl h-[85vh] max-h-[800px] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#434c9d]/5 to-[#96cbc3]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#434c9d] to-[#96cbc3] rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {recipientName}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Conversation about your booking
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                window.location.href = "/messages";
              }}
              className="flex items-center gap-2 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View All Messages
            </Button>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white space-y-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#434c9d] border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-[#434c9d]" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">No messages yet</p>
                <p className="text-sm text-gray-600 mb-4">Start the conversation!</p>
                <p className="text-xs text-gray-400">
                  Tip: You can also continue this conversation in the main Messages page
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!isOwn && (
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                      isOwn
                        ? "bg-gradient-to-br from-[#434c9d] to-[#434c9d]/90 text-white"
                        : "bg-white border border-gray-200 text-gray-900"
                    )}
                  >
                    {!isOwn && (
                      <p className="text-xs font-semibold mb-1.5 text-gray-700 opacity-80">
                        {message.sender_name}
                      </p>
                    )}
                    {message.image_url && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        <img
                          src={message.image_url}
                          alt="Message attachment"
                          className="max-w-full max-h-64 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.image_url!, '_blank')}
                        />
                      </div>
                    )}
                    {message.content && (
                      <p className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap break-words",
                        isOwn ? "text-white" : "text-gray-900"
                      )}>
                        {message.content}
                      </p>
                    )}
                    <p className={cn(
                      "text-xs mt-2",
                      isOwn ? "text-blue-100" : "text-gray-500"
                    )}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white space-y-3">
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-xs max-h-48 rounded-xl object-contain border-2 border-gray-200 shadow-sm"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full shadow-lg"
                onClick={removeImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingImage}
              className="h-10 w-10 p-0 border-gray-300 hover:border-[#434c9d] hover:bg-[#434c9d]/5 transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-gray-600" />
            </Button>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none min-h-[44px] max-h-32 border-gray-300 focus:border-[#434c9d] focus:ring-[#434c9d] rounded-xl"
              rows={2}
              disabled={uploadingImage}
            />
            <Button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
              className="h-10 px-6 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white shadow-md hover:shadow-lg transition-all rounded-xl"
            >
              {uploadingImage ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
