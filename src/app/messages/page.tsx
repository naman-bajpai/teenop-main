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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const addMessageSafely = (newMessage: Message) => {
    setMessages(prev => {
      const messageExists = prev.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        return prev;
      }
      return [...prev, newMessage];
    });
  };

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/messages/conversations", {
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      
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
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    const bookingId = searchParams.get('booking_id');
    if (bookingId && conversations.length > 0) {
      const conversation = conversations.find(conv => conv.booking_id === bookingId);
      if (conversation && (!selectedConversation || selectedConversation.id !== conversation.id)) {
        setSelectedConversation(conversation);
      }
    }
  }, [searchParams, conversations, selectedConversation]);

  useEffect(() => {
    const handleMessageSent = (event: CustomEvent) => {
      const { bookingId, message } = event.detail;
      
      if (selectedConversation && selectedConversation.booking_id === bookingId) {
        addMessageSafely(message);
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, last_message: message }
              : conv
          )
        );
      } else {
        fetchConversations();
      }
    };

    window.addEventListener('messageSent', handleMessageSent as EventListener);
    
    return () => {
      window.removeEventListener('messageSent', handleMessageSent as EventListener);
    };
  }, [selectedConversation, fetchConversations]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;
      
      try {
        const response = await fetch(`/api/messages?booking_id=${selectedConversation.booking_id}`, {
          cache: "no-store"
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const uniqueMessages = (data.messages || []).filter((message: Message, index: number, self: Message[]) => 
              index === self.findIndex(m => m.id === message.id)
            );
            setMessages(uniqueMessages);
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: selectedConversation.booking_id,
          }),
        });
        
        if (response.ok) {
          setConversations(prev => 
            prev.map(conv => 
              conv.id === selectedConversation.id 
                ? { ...conv, unread_count: 0 }
                : conv
            )
          );
        }
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    };

    fetchMessages();
    markMessagesAsRead();
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation) return;

    try {
      setSending(true);
      let imageUrl = null;

      if (selectedImage) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('booking_id', selectedConversation.booking_id);

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
          booking_id: selectedConversation.booking_id,
          receiver_id: selectedConversation.other_person.id,
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
        addMessageSafely(data.message);
        setNewMessage("");
        removeImage();
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, last_message: data.message }
              : conv
          )
        );

        window.dispatchEvent(new CustomEvent('messageSent', {
          detail: {
            bookingId: selectedConversation.booking_id,
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

  const handleDeleteClick = (conversation: Conversation, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const deleteConversation = async () => {
    if (!conversationToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/messages/conversations?booking_id=${conversationToDelete.booking_id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete conversation");
      }

      const data = await response.json();
      if (data.success) {
        setConversations(prev => 
          prev.filter(conv => conv.id !== conversationToDelete.id)
        );
        
        if (selectedConversation?.id === conversationToDelete.id) {
          setSelectedConversation(null);
          setMessages([]);
        }

        toast({
          title: "Conversation deleted",
          description: "The conversation has been permanently deleted.",
        });
        
        setDeleteDialogOpen(false);
        setConversationToDelete(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive",
      });
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
    } catch {
      return timeString;
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_person.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_person.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.booking.service.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#434c9d] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!userLoading && (!user || userError)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            {userError === 'Profile not found. Please complete your profile setup.' 
              ? 'Please complete your profile setup to continue.'
              : 'Unable to load user data. Please try logging in again.'}
          </p>
          <Button 
            onClick={() => window.location.href = userError === 'Profile not found. Please complete your profile setup.' ? '/profile' : '/login'} 
            className="mt-4"
          >
            {userError === 'Profile not found. Please complete your profile setup.' ? 'Complete Profile' : 'Go to Login'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="h-[calc(100vh-80px)] flex bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Conversations Sidebar */}
        <div className="w-full md:w-96 border-r border-gray-200 bg-white flex flex-col shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#434c9d]/5 to-[#96cbc3]/5">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#434c9d] to-[#96cbc3] rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              Messages
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 focus:border-[#434c9d] focus:ring-[#434c9d] rounded-xl"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-[#434c9d]" />
                </div>
                <p className="text-gray-900 font-semibold mb-1">
                  {searchQuery ? "No conversations found" : "No messages yet"}
                </p>
                <p className="text-sm text-gray-600">
                  {searchQuery ? "Try a different search term" : "Start a conversation by booking a service"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all duration-200 group",
                      selectedConversation?.id === conversation.id
                        ? "bg-gradient-to-r from-[#434c9d]/10 to-[#96cbc3]/10 border-2 border-[#434c9d]/20 shadow-sm"
                        : "hover:bg-gray-50 border-2 border-transparent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                        {conversation.other_person.avatar_url ? (
                          <img
                            src={conversation.other_person.avatar_url}
                            alt={`${conversation.other_person.first_name} ${conversation.other_person.last_name}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {conversation.other_person.first_name} {conversation.other_person.last_name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {conversation.unread_count > 0 && (
                              <Badge className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-2 font-semibold">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteClick(conversation, e)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {conversation.booking.service.title}
                        </p>
                        
                        {conversation.last_message && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.last_message.image_url 
                                ? "📷 Image" 
                                : conversation.last_message.content}
                            </p>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {formatMessageTime(conversation.last_message.created_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col hidden md:flex">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#434c9d] to-[#96cbc3] rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                      {selectedConversation.other_person.avatar_url ? (
                        <img
                          src={selectedConversation.other_person.avatar_url}
                          alt={`${selectedConversation.other_person.first_name} ${selectedConversation.other_person.last_name}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">
                        {selectedConversation.other_person.first_name} {selectedConversation.other_person.last_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {selectedConversation.booking.service.title}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteClick(selectedConversation)}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Booking Info */}
                <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-4 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#434c9d]" />
                      <span className="font-medium">{new Date(selectedConversation.booking.requested_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#434c9d]" />
                      <span className="font-medium">{formatTime(selectedConversation.booking.requested_time)}</span>
                    </div>
                    <Badge className={cn(
                      "text-xs font-semibold",
                      selectedConversation.booking.status === "confirmed" && "bg-green-100 text-green-800",
                      selectedConversation.booking.status === "pending" && "bg-yellow-100 text-yellow-800",
                      selectedConversation.booking.status === "paid" && "bg-blue-100 text-blue-800",
                      selectedConversation.booking.status === "completed" && "bg-gray-100 text-gray-800",
                      selectedConversation.booking.status === "rejected" && "bg-red-100 text-red-800"
                    )}>
                      {selectedConversation.booking.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-10 h-10 text-[#434c9d]" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-2">No messages yet</p>
                      <p className="text-sm text-gray-600">Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
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
                            {formatMessageTime(message.created_at)}
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
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 border-gray-300 focus:border-[#434c9d] focus:ring-[#434c9d] rounded-xl"
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-12 h-12 text-[#434c9d]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-bold">Delete Conversation</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2">
              Are you sure you want to delete the conversation with{" "}
              <span className="font-semibold text-gray-900">
                {conversationToDelete?.other_person.first_name} {conversationToDelete?.other_person.last_name}
              </span>? 
              <br /><br />
              This action cannot be undone. All messages in this conversation will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConversationToDelete(null);
              }}
              disabled={deleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteConversation}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Conversation"
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
      <DashboardLayout user={null}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#434c9d] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading messages...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
