"use client";
import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  MessageCircle,
  User,
  Calendar,
  Clock,
  ArrowLeft,
  Send,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  created_at: string;
  sender_name: string;
}

export default function MessagesPage() {
  const { user, loading: userLoading, error: userError } = useUser();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Helper function to add a message without duplicates
  const addMessageSafely = (newMessage: Message) => {
    setMessages(prev => {
      const messageExists = prev.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        return prev;
      }
      return [...prev, newMessage];
    });
  };

  // Fetch conversations
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
        // Set empty conversations array on error so the page still renders
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

  // Listen for messages sent from other components (like MessageDialog)
  useEffect(() => {
    const handleMessageSent = (event: CustomEvent) => {
      const { bookingId, message } = event.detail;
      
      // If the current conversation matches the booking, add the message to the current view
      if (selectedConversation && selectedConversation.booking_id === bookingId) {
        addMessageSafely(message);
        // Update the last message in the current conversation
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, last_message: message }
              : conv
          )
        );
      } else {
        // Only refresh conversations if it's a different conversation
        fetchConversations();
      }
      
      // Show a toast notification about the new message
      toast({
        title: "New message sent",
        description: "Your message has been sent. Check the Messages page to continue the conversation.",
      });
    };

    window.addEventListener('messageSent', handleMessageSent as EventListener);
    
    return () => {
      window.removeEventListener('messageSent', handleMessageSent as EventListener);
    };
  }, [selectedConversation, toast, fetchConversations]);

  // Fetch messages for selected conversation
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
            // Remove duplicates based on message ID when fetching from API
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
        // Call the API to mark messages as read
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
          // Only update local state if API call was successful
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: selectedConversation.booking_id,
          receiver_id: selectedConversation.other_person.id,
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      if (data.success) {
        // Add message to current view
        addMessageSafely(data.message);
        setNewMessage("");
        
        // Update last message in conversations
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, last_message: data.message }
              : conv
          )
        );

        // Trigger event for other components to listen
        window.dispatchEvent(new CustomEvent('messageSent', {
          detail: {
            bookingId: selectedConversation.booking_id,
            message: data.message
          }
        }));
      }
    } catch (error: any) {
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
    } else if (diffInHours < 168) { // 7 days
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user data
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
      <div className="h-[calc(100vh-80px)] flex">
        {/* Conversations Sidebar */}
        <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchQuery ? "No conversations found" : "No messages yet"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? "Try a different search term" : "Start a conversation by booking a service or accepting a booking request"}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Conversations will appear here once you have bookings with other users
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={cn(
                      "p-4 rounded-lg cursor-pointer transition-colors",
                      selectedConversation?.id === conversation.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {conversation.other_person.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
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
                          {conversation.unread_count > 0 && (
                            <Badge className="bg-blue-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-2">
                              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {conversation.booking.service.title}
                        </p>
                        
                        {conversation.last_message && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.last_message.content}
                            </p>
                            <span className="text-xs text-gray-400 ml-2">
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
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {selectedConversation.other_person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedConversation.other_person.avatar_url}
                          alt={`${selectedConversation.other_person.first_name} ${selectedConversation.other_person.last_name}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {selectedConversation.other_person.first_name} {selectedConversation.other_person.last_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {selectedConversation.booking.service.title}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Booking Info */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedConversation.booking.requested_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(selectedConversation.booking.requested_time)}
                    </div>
                    <Badge className={cn(
                      "text-xs",
                      selectedConversation.booking.status === "confirmed" && "bg-green-100 text-green-800",
                      selectedConversation.booking.status === "pending" && "bg-yellow-100 text-yellow-800",
                      selectedConversation.booking.status === "completed" && "bg-gray-100 text-gray-800",
                      selectedConversation.booking.status === "rejected" && "bg-red-100 text-red-800"
                    )}>
                      {selectedConversation.booking.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No messages yet</p>
                    <p className="text-sm text-gray-500">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] p-3 rounded-lg",
                            isOwn
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            isOwn ? "text-blue-100" : "text-gray-500"
                          )}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}