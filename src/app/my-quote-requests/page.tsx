"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { QuoteRequest, Quote } from "@/types/quote";
import {
  MessageSquare,
  Clock,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MyQuoteRequestsPage() {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchQuoteRequests();
    }
  }, [user, selectedStatus]);

  const fetchQuoteRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ role: "customer" });
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      const response = await fetch(`/api/quotes/request?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setQuoteRequests(result.quote_requests || []);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load quote requests",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      toast({
        title: "Error",
        description: "Failed to load quote requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-800", label: "Pending" },
      quoted: { className: "bg-blue-100 text-blue-800", label: "Quoted" },
      accepted: { className: "bg-green-100 text-green-800", label: "Accepted" },
      rejected: { className: "bg-red-100 text-red-800", label: "Rejected" },
      cancelled: { className: "bg-gray-100 text-gray-800", label: "Cancelled" },
      expired: { className: "bg-orange-100 text-orange-800", label: "Expired" },
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge className={variant.className}>{variant.label}</Badge>
    );
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to accept this quote? A booking will be created.")) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Quote Accepted",
          description: "Booking created successfully. Redirecting to payment...",
        });
        // Refresh quote requests
        fetchQuoteRequests();
        // Redirect to booking page or payment
        if (result.booking) {
          router.push(`/booking/${result.booking.id}`);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to accept quote",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error accepting quote:", error);
      toast({
        title: "Error",
        description: "Failed to accept quote",
        variant: "destructive",
      });
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to reject this quote?")) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/reject`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Quote Rejected",
          description: "Quote has been rejected",
        });
        fetchQuoteRequests();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reject quote",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error rejecting quote:", error);
      toast({
        title: "Error",
        description: "Failed to reject quote",
        variant: "destructive",
      });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this quote request?")) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/request/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Request Cancelled",
          description: "Quote request has been cancelled",
        });
        fetchQuoteRequests();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  if (userLoading || loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quote requests...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Quote Requests</h1>
          <p className="text-gray-600">Manage your quote requests and view quotes from providers</p>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={selectedStatus === "all" ? "default" : "outline"}
            onClick={() => setSelectedStatus("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={selectedStatus === "pending" ? "default" : "outline"}
            onClick={() => setSelectedStatus("pending")}
            size="sm"
          >
            Pending
          </Button>
          <Button
            variant={selectedStatus === "quoted" ? "default" : "outline"}
            onClick={() => setSelectedStatus("quoted")}
            size="sm"
          >
            Quoted
          </Button>
          <Button
            variant={selectedStatus === "accepted" ? "default" : "outline"}
            onClick={() => setSelectedStatus("accepted")}
            size="sm"
          >
            Accepted
          </Button>
        </div>

        {/* Quote Requests List */}
        {quoteRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quote Requests</h3>
            <p className="text-gray-600 mb-4">
              {selectedStatus !== "all"
                ? `No ${selectedStatus} quote requests found.`
                : "You haven't requested any quotes yet."}
            </p>
            <Button onClick={() => router.push("/")}>
              Browse Services
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {quoteRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {(request.service as any)?.title || "Service"}
                      </h3>
                      {getStatusBadge(request.status)}
                    </div>
                    {request.requested_date && request.requested_time && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(request.requested_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {request.requested_time}
                        </div>
                      </div>
                    )}
                  </div>
                  {["pending", "quoted"].includes(request.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelRequest(request.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                {request.image_url && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Reference Image:</p>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={request.image_url}
                        alt="Quote request reference"
                        className="w-full max-h-64 object-contain bg-gray-50"
                        onClick={() => window.open(request.image_url!, '_blank')}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}
                {request.special_instructions && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Instructions:</strong> {request.special_instructions}
                    </p>
                  </div>
                )}

                {/* Quotes */}
                {request.quotes && request.quotes.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    <h4 className="font-semibold text-gray-900">Quotes Received:</h4>
                    {request.quotes.map((quote: Quote) => (
                      <div
                        key={quote.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          quote.status === "accepted"
                            ? "bg-green-50 border-green-200"
                            : quote.status === "rejected"
                            ? "bg-red-50 border-red-200 opacity-60"
                            : "bg-blue-50 border-blue-200"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <DollarSign className="w-5 h-5 text-green-600" />
                              <span className="text-2xl font-bold text-gray-900">
                                ${quote.price.toFixed(2)}
                              </span>
                              {quote.estimated_duration && (
                                <span className="text-sm text-gray-600">
                                  ({quote.estimated_duration} min)
                                </span>
                              )}
                            </div>
                            {quote.notes && (
                              <p className="text-sm text-gray-700 mb-2">{quote.notes}</p>
                            )}
                            {quote.valid_until && (
                              <p className="text-xs text-gray-500">
                                Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                              </p>
                            )}
                            {quote.status === "pending" && quote.valid_until && new Date(quote.valid_until) < new Date() && (
                              <Badge className="bg-orange-100 text-orange-800 mt-2">Expired</Badge>
                            )}
                          </div>
                          {quote.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptQuote(quote.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectQuote(quote.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {quote.status === "accepted" && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Accepted
                            </Badge>
                          )}
                          {quote.status === "rejected" && (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : request.status === "pending" ? (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-sm">Waiting for provider to submit a quote...</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

