"use client";
import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";
import {
  Search,
  MessageCircle,
  User,
  Calendar,
  Clock,
  ArrowLeft,
  Send,
  Trash2,
  Image as ImageIcon,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Conversation {
  id: string;
  booking_id: string;
  other_person: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    image_url?: string | null;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  booking: {
    id: string;
    service: {
      title: string;
      category: string;
    };
    status: string;
    requested_date: string;
    requested_time: string;
  };
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  sender_name: string;
}

function MessagesPageContent() {
  const { user, loading: userLoading, error: userError } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const addMessageSafely = (newMessage: Message) => {
    setMessages(prev => {
      const messageExists = prev.some(msg => msg.id === newMessage.id);
      if (messageExists) return prev;
      return [...prev, newMessage];
    });
  };

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      // Cache for 10 seconds - messages change frequently but don't need real-time
      const response = await fetch("/api/messages/conversations", {
        next: { revalidate: 10 }
      });

      if (!response.ok) throw new Error("Failed to fetch conversations");

      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load conversations",
        variant: "destructive"
      });
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  const processingBookingId = useRef<string | null>(null);

  useEffect(() => {
    const bookingId = searchParams.get('booking_id');
    if (processingBookingId.current !== bookingId) processingBookingId.current = null;

    if (bookingId && user && !loading) {
      if (processingBookingId.current === bookingId) return;

      if (conversations.length > 0) {
        const conversation = conversations.find(conv => conv.booking_id === bookingId);
        if (conversation) {
          if (!selectedConversation || selectedConversation.id !== conversation.id) {
            setSelectedConversation(conversation);
          }
          processingBookingId.current = bookingId;
          return;
        }
      }

      const fetchBookingConversation = async () => {
        processingBookingId.current = bookingId;
        try {
          // Cache for 10 seconds - booking details don't change that often
          const response = await fetch(`/api/bookings/${bookingId}`, { next: { revalidate: 10 } });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.booking) {
              const booking = data.booking;
              const service = booking.service || booking.services;

              let otherPerson;
              if (booking.user_id === user?.id) {
                otherPerson = service?.profiles || service?.user_id ? {
                  id: service?.user_id || service?.profiles?.id,
                  first_name: service?.profiles?.first_name || "",
                  last_name: service?.profiles?.last_name || "",
                  avatar_url: service?.profiles?.avatar_url
                } : null;
              } else {
                otherPerson = booking.profiles ? {
                  id: booking.profiles.id,
                  first_name: booking.profiles.first_name || "",
                  last_name: booking.profiles.last_name || "",
                  avatar_url: booking.profiles.avatar_url
                } : null;
              }

              if (otherPerson && otherPerson.id) {
                const newConversation: Conversation = {
                  id: booking.id,
                  booking_id: booking.id,
                  other_person: {
                    id: otherPerson.id,
                    first_name: otherPerson.first_name || "",
                    last_name: otherPerson.last_name || "",
                    avatar_url: otherPerson.avatar_url || undefined
                  },
                  last_message: undefined,
                  unread_count: 0,
                  booking: {
                    id: booking.id,
                    service: {
                      title: service?.title || "Service",
                      category: service?.category || ""
                    },
                    status: booking.status,
                    requested_date: booking.requested_date,
                    requested_time: booking.requested_time
                  }
                };

                setConversations(prev => {
                  const exists = prev.some(conv => conv.booking_id === bookingId);
                  if (!exists) return [newConversation, ...prev];
                  return prev;
                });

                setSelectedConversation(newConversation);

                // Cache for 5 seconds - messages need to be relatively fresh
                const messagesResponse = await fetch(`/api/messages?booking_id=${bookingId}`, { next: { revalidate: 5 } });
                if (messagesResponse.ok) {
                  const messagesData = await messagesResponse.json();
                  if (messagesData.success && messagesData.messages) {
                    setMessages(messagesData.messages);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching booking conversation:", error);
          processingBookingId.current = null;
        }
      };

      if (user && !loading) fetchBookingConversation();
    }
  }, [searchParams, conversations, selectedConversation, user, loading]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;
      try {
        // Cache for 5 seconds - messages need to be relatively fresh
        const response = await fetch(`/api/messages?booking_id=${selectedConversation.booking_id}`, {
          next: { revalidate: 5 }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const uniqueMessages = (data.messages || []).filter((message: Message, index: number, self: Message[]) =>
              index === self.findIndex(m => m.id === message.id)
            );
            setMessages(prev => {
              if (prev.length === uniqueMessages.length && prev.every((msg, i) => msg.id === uniqueMessages[i].id)) return prev;
              return uniqueMessages;
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    const markMessagesAsRead = async () => {
      if (!selectedConversation) return;
      try {
        const response = await fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: selectedConversation.booking_id }),
        });
        if (response.ok) {
          setConversations(prev =>
            prev.map(conv => conv.id === selectedConversation.id ? { ...conv, unread_count: 0 } : conv)
          );
        }
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    };

    fetchMessages();
    markMessagesAsRead();
  }, [selectedConversation]);



  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation || !user) return;

    const messageContent = newMessage.trim();
    const currentImage = selectedImage;

    // Clear input immediately for better UX
    setNewMessage("");

    try {
      setSending(true);
      let imageUrl = null;
      if (currentImage) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', currentImage);
        formData.append('booking_id', selectedConversation.booking_id);
        const uploadResponse = await fetch("/api/messages/upload-image", { method: "POST", body: formData });
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload image");
        }
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
        setUploadingImage(false);
      }

      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: selectedConversation.other_person.id,
        content: messageContent || "",
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        sender_name: "You"
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);
      removeImage();

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: selectedConversation.booking_id,
          receiver_id: selectedConversation.other_person.id,
          content: messageContent || null,
          image_url: imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      if (data.success) {
        // Replace optimistic message with real message from server
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessage.id ? data.message : msg
        ));
        setConversations(prev =>
          prev.map(conv => conv.id === selectedConversation.id ? { ...conv, last_message: data.message } : conv)
        );
        window.dispatchEvent(new CustomEvent('messageSent', { detail: { bookingId: selectedConversation.booking_id, message: data.message } }));
      }
    } catch (error: any) {
      setUploadingImage(false);
      // Restore the message content if sending failed
      setNewMessage(messageContent);
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const handleDeleteClick = (conversation: Conversation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const deleteConversation = async () => {
    if (!conversationToDelete) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/messages/conversations?booking_id=${conversationToDelete.booking_id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete conversation");
      }
      const data = await response.json();
      if (data.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id));
        if (selectedConversation?.id === conversationToDelete.id) {
          setSelectedConversation(null);
          setMessages([]);
        }
        toast({ title: "Conversation deleted", description: "The conversation has been permanently deleted." });
        setDeleteDialogOpen(false);
        setConversationToDelete(null);
        fetchConversations();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete conversation", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch { return timeString; }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    else if (diffInHours < 168) return date.toLocaleDateString([], { weekday: 'short' });
    else return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_person.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_person.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.booking.service.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#434c9d] border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!userLoading && (!user || userError)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <User className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Login Required</h3>
          <p className="text-sm text-gray-500 mb-6">
            {userError === 'Profile not found. Please complete your profile setup.'
              ? 'Please complete your profile setup to continue.'
              : 'Unable to load user data. Please try logging in again.'}
          </p>
          <Button
            onClick={() => window.location.href = userError === 'Profile not found. Please complete your profile setup.' ? '/profile' : '/login'}
            className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-xl py-6"
          >
            {userError === 'Profile not found. Please complete your profile setup.' ? 'Complete Profile' : 'Go to Login'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user} hideFooter>
      <div className="h-[calc(100vh-64px)] flex bg-white relative overflow-hidden">
        {/* Conversations Sidebar */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 border-r border-gray-100 bg-white flex flex-col transition-all duration-300",
          selectedConversation ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Messages
                {conversations.reduce((sum, c) => sum + c.unread_count, 0) > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-[#ff725a] animate-pulse" />
                )}
              </h1>
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#434c9d] transition-colors" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#434c9d]/30 focus:ring-[#434c9d]/10 rounded-xl transition-all"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {searchQuery ? "No matches found" : "No messages yet"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {searchQuery ? "Try searching for someone else" : "Book a service to start chatting"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-all duration-200 group relative",
                      selectedConversation?.id === conversation.id
                        ? "bg-[#434c9d]/5 border-transparent"
                        : "hover:bg-gray-50 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shadow-sm">
                          {conversation.other_person.avatar_url ? (
                            <img
                              src={conversation.other_person.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10">
                              <User className="w-5 h-5 text-[#434c9d]/60" />
                            </div>
                          )}
                        </div>
                        {conversation.unread_count > 0 && (
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff725a] border-2 border-white rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">
                            {conversation.other_person.first_name} {conversation.other_person.last_name}
                          </h3>
                          {conversation.last_message && (
                            <span className="text-[10px] text-gray-400 font-medium uppercase">
                              {formatMessageTime(conversation.last_message.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-xs truncate flex-1 min-w-0",
                            conversation.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                          )}>
                            {conversation.last_message
                              ? (conversation.last_message.image_url ? "📷 Image" : conversation.last_message.content)
                              : conversation.booking.service.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteClick(conversation, e)}
                            className="h-6 w-6 p-0 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col bg-[#fafafa] transition-all duration-300",
          selectedConversation ? "flex" : "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden -ml-2 h-8 w-8 p-0"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-50 shadow-sm">
                      {selectedConversation.other_person.avatar_url ? (
                        <img
                          src={selectedConversation.other_person.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-sm leading-tight">
                        {selectedConversation.other_person.first_name} {selectedConversation.other_person.last_name}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Active Conversation</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">
                        {new Date(selectedConversation.booking.requested_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs font-medium text-gray-600">
                        {formatTime(selectedConversation.booking.requested_time)}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                      selectedConversation.booking.status === "confirmed" && "bg-green-50 text-green-700 border-green-100",
                      selectedConversation.booking.status === "pending" && "bg-yellow-50 text-yellow-700 border-yellow-100",
                      selectedConversation.booking.status === "paid" && "bg-blue-50 text-blue-700 border-blue-100",
                      selectedConversation.booking.status === "completed" && "bg-gray-50 text-gray-700 border-gray-100",
                      selectedConversation.booking.status === "rejected" && "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {selectedConversation.booking.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white/40">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-gray-50">
                      <MessageCircle className="w-8 h-8 text-[#434c9d]/30" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No messages yet</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-[240px]">
                      Send a message to discuss details about the {selectedConversation.booking.service.title} service.
                    </p>
                  </div>
                ) : (
                  messages.map((message, idx) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-end gap-2 group/msg",
                          isOwn ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div className={cn(
                          "flex flex-col max-w-[80%] sm:max-w-[70%]",
                          isOwn ? "items-end" : "items-start"
                        )}>
                          <div
                            className={cn(
                              "relative px-4 py-2.5 shadow-sm transition-all",
                              isOwn
                                ? "bg-[#434c9d] text-white rounded-[20px] rounded-br-[4px]"
                                : "bg-white text-gray-900 border border-gray-100 rounded-[20px] rounded-bl-[4px]"
                            )}
                          >
                            {message.image_url && (
                              <div className="mb-2 -mx-1 -mt-1 rounded-[16px] overflow-hidden">
                                <img
                                  src={message.image_url}
                                  alt=""
                                  className="max-w-full max-h-80 object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                                  onClick={() => window.open(message.image_url!, '_blank')}
                                />
                              </div>
                            )}
                            {message.content && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-gray-400 mt-1.5 px-1 uppercase tracking-tighter">
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="max-w-4xl mx-auto">
                  {imagePreview && (
                    <div className="relative inline-block mb-3 group">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-auto rounded-xl object-cover border-2 border-gray-50 shadow-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={removeImage}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-end gap-2 bg-gray-50/50 p-1.5 rounded-[24px] border border-gray-100 focus-within:border-[#434c9d]/20 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#434c9d]/5 transition-all">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || uploadingImage}
                      className="h-10 w-10 p-0 rounded-full text-gray-400 hover:text-[#434c9d] hover:bg-[#434c9d]/5 transition-colors"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </Button>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Message..."
                      className="flex-1 max-h-32 min-h-[40px] py-2.5 px-1 bg-transparent border-none focus:ring-0 text-sm resize-none custom-scrollbar"
                      disabled={uploadingImage}
                      autoFocus={false}
                      rows={1}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
                      className="h-10 w-10 p-0 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white shadow-sm rounded-full transition-all shrink-0"
                    >
                      {uploadingImage ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 ml-0.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 ml-4 font-medium">
                    Shift + Enter for new line
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 border border-gray-50/50">
                <MessageCircle className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Your Inbox</h3>
              <p className="text-gray-500 mt-2 text-center max-w-[280px]">
                Select a conversation from the sidebar to view messages and discuss service details.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-none rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-xl font-bold">Delete Chat?</DialogTitle>
            </div>
            <DialogDescription className="text-gray-500 pt-2 text-sm leading-relaxed">
              This will permanently delete your conversation with{" "}
              <span className="font-bold text-gray-900">
                {conversationToDelete?.other_person.first_name} {conversationToDelete?.other_person.last_name}
              </span>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConversationToDelete(null);
              }}
              disabled={deleting}
              className="flex-1 rounded-xl h-12 font-semibold text-gray-500 hover:bg-gray-50 transition-all"
            >
              Keep Chat
            </Button>
            <Button
              variant="destructive"
              onClick={deleteConversation}
              disabled={deleting}
              className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl h-12 font-semibold shadow-md shadow-red-100 transition-all"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Delete Chat"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout user={null} hideFooter>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#434c9d] border-t-transparent" />
        </div>
      </DashboardLayout>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
