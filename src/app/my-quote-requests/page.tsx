"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Star,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  User,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/use-toast";
import { QuoteRequest, Quote } from "@/types/quote";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function getStatusConfig(status: string) {
  const configs: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ReactNode; label: string }> = {
    pending: {
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: <AlertCircle className="w-4 h-4" />,
      label: "Pending"
    },
    quoted: {
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: <FileText className="w-4 h-4" />,
      label: "Quoted"
    },
    accepted: {
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Accepted"
    },
    rejected: {
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: <XCircle className="w-4 h-4" />,
      label: "Rejected"
    },
    expired: {
      color: "text-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: <Clock className="w-4 h-4" />,
      label: "Expired"
    },
    cancelled: {
      color: "text-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: <XCircle className="w-4 h-4" />,
      label: "Cancelled"
    }
  };
  return configs[status] || configs.pending;
}

export default function MyQuoteRequestsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<QuoteRequest | null>(null);
  const [acceptingQuote, setAcceptingQuote] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchQuoteRequests();
    }
  }, [user]);

  const fetchQuoteRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/quotes/request?role=customer", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuoteRequests(data.quote_requests || []);
        }
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

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      setAcceptingQuote(quoteId);
      const response = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept quote");
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Quote Accepted!",
          description: "Your booking has been created. Please proceed to payment.",
        });
        fetchQuoteRequests();
        setSelectedQuoteRequest(null);
        // Redirect to booking page or payment
        if (data.booking) {
          router.push(`/booking/${data.booking.id}`);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept quote",
        variant: "destructive",
      });
    } finally {
      setAcceptingQuote(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);

  const pendingRequests = quoteRequests.filter(qr => qr.status === "pending" || qr.status === "quoted");
  const acceptedRequests = quoteRequests.filter(qr => qr.status === "accepted");
  const otherRequests = quoteRequests.filter(qr => !["pending", "quoted", "accepted"].includes(qr.status));

  if (userLoading) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#434c9d] mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-orange-50/20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#434c9d]/20 to-[#96cbc3]/20 rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-[#434c9d]" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
                  My Quote Requests
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Track and manage your quote requests
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-8">
              <TabsList className="inline-flex w-full sm:grid sm:grid-cols-4 bg-gray-100 p-1 rounded-xl h-auto min-w-max sm:min-w-0">
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3 px-4 text-sm"
                >
                  Pending ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger
                  value="accepted"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3 px-4 text-sm"
                >
                  Accepted ({acceptedRequests.length})
                </TabsTrigger>
                <TabsTrigger
                  value="cancelled"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3 px-4 text-sm"
                >
                  Cancelled ({otherRequests.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Pending Tab */}
            <TabsContent value="pending" className="mt-6">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-[#434c9d] mx-auto mb-4" />
                  <p className="text-gray-600">Loading quote requests...</p>
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingRequests.map((qr) => {
                    const statusConfig = getStatusConfig(qr.status);
                    return (
                      <QuoteRequestCard
                        key={qr.id}
                        quoteRequest={qr}
                        statusConfig={statusConfig}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        formatPrice={formatPrice}
                        onViewDetails={() => setSelectedQuoteRequest(qr)}
                        onMessage={() => router.push("/messages")}
                        onAcceptQuote={qr.quotes && qr.quotes.length > 0 ? () => handleAcceptQuote(qr.quotes![0].id) : undefined}
                        acceptingQuote={acceptingQuote}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<AlertCircle className="w-16 h-16" />}
                  title="No Pending Requests"
                  description="You don't have any pending quote requests at the moment."
                />
              )}
            </TabsContent>

            {/* Accepted Tab */}
            <TabsContent value="accepted" className="mt-6">
              {acceptedRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {acceptedRequests.map((qr) => {
                    const statusConfig = getStatusConfig(qr.status);
                    return (
                      <QuoteRequestCard
                        key={qr.id}
                        quoteRequest={qr}
                        statusConfig={statusConfig}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        formatPrice={formatPrice}
                        onViewDetails={() => setSelectedQuoteRequest(qr)}
                        onMessage={() => router.push("/messages")}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<CheckCircle className="w-16 h-16" />}
                  title="No Accepted Quotes"
                  description="Accepted quotes will appear here."
                />
              )}
            </TabsContent>

            {/* Other Tab */}
            <TabsContent value="cancelled" className="mt-6">
              {otherRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherRequests.map((qr) => {
                    const statusConfig = getStatusConfig(qr.status);
                    return (
                      <QuoteRequestCard
                        key={qr.id}
                        quoteRequest={qr}
                        statusConfig={statusConfig}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        formatPrice={formatPrice}
                        onViewDetails={() => setSelectedQuoteRequest(qr)}
                        onMessage={() => router.push("/messages")}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<XCircle className="w-16 h-16" />}
                  title="No Other Requests"
                  description="Rejected, expired, or cancelled requests will appear here."
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Quote Request Details Dialog */}
        {selectedQuoteRequest && (
          <QuoteRequestDetailsDialog
            quoteRequest={selectedQuoteRequest}
            isOpen={!!selectedQuoteRequest}
            onClose={() => setSelectedQuoteRequest(null)}
            onAcceptQuote={selectedQuoteRequest.quotes && selectedQuoteRequest.quotes.length > 0 ? () => handleAcceptQuote(selectedQuoteRequest.quotes![0].id) : undefined}
            acceptingQuote={acceptingQuote}
            formatDate={formatDate}
            formatTime={formatTime}
            formatPrice={formatPrice}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Quote Request Card Component
function QuoteRequestCard({
  quoteRequest,
  statusConfig,
  formatDate,
  formatTime,
  formatPrice,
  onViewDetails,
  onMessage,
  onAcceptQuote,
  acceptingQuote
}: {
  quoteRequest: QuoteRequest;
  statusConfig: ReturnType<typeof getStatusConfig>;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatPrice: (price: number) => string;
  onViewDetails: () => void;
  onMessage: () => void;
  onAcceptQuote?: () => void;
  acceptingQuote?: string | null;
}) {
  const hasQuote = quoteRequest.quotes && quoteRequest.quotes.length > 0;
  const quote = hasQuote ? quoteRequest.quotes![0] : null;

  return (
    <div className="group relative bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#434c9d]/30 hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-[#434c9d]/5 to-[#96cbc3]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="relative">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{quoteRequest.service?.title || 'Service'}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{quoteRequest.service?.description || 'No description'}</p>
          </div>
        </div>

        {quoteRequest.requested_date && quoteRequest.requested_time && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900">{formatDate(quoteRequest.requested_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-gray-900">{formatTime(quoteRequest.requested_time)}</span>
              </div>
            </div>
          </div>
        )}

        {hasQuote && quote && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-green-900">Provider's Quote:</p>
              <Badge className="bg-green-600 text-white">New Quote</Badge>
            </div>
            <p className="text-2xl font-bold text-green-700 mb-1">{formatPrice(quote.price)}</p>
            {quote.estimated_duration && (
              <p className="text-xs text-green-600">Est. {quote.estimated_duration} minutes</p>
            )}
            {quote.notes && (
              <p className="text-sm text-green-800 mt-2 line-clamp-2">{quote.notes}</p>
            )}
          </div>
        )}

        {quoteRequest.image_url && (
          <div className="mb-4">
            <img
              src={quoteRequest.image_url}
              alt="Quote request"
              className="w-full h-32 object-cover rounded-xl border border-gray-200"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onViewDetails}
            className="flex-1 min-w-[100px] border-2 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white text-xs sm:text-sm"
          >
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Details</span>
            <span className="sm:hidden">View</span>
          </Button>
          {hasQuote && onAcceptQuote && (
            <Button
              size="sm"
              onClick={onAcceptQuote}
              disabled={acceptingQuote === quote!.id}
              className="flex-1 min-w-[100px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs sm:text-sm"
            >
              {acceptingQuote === quote!.id ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Accepting...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Accept
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onMessage}
            className="flex-1 min-w-[100px] border-2 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white text-xs sm:text-sm"
          >
            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Message
          </Button>
        </div>
      </div>
    </div>
  );
}

// Quote Request Details Dialog
function QuoteRequestDetailsDialog({
  quoteRequest,
  isOpen,
  onClose,
  onAcceptQuote,
  acceptingQuote,
  formatDate,
  formatTime,
  formatPrice
}: {
  quoteRequest: QuoteRequest;
  isOpen: boolean;
  onClose: () => void;
  onAcceptQuote?: () => void;
  acceptingQuote?: string | null;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatPrice: (price: number) => string;
}) {
  const [loadingMessage, setLoadingMessage] = useState(false);
  const hasQuote = quoteRequest.quotes && quoteRequest.quotes.length > 0;
  const quote = hasQuote ? quoteRequest.quotes![0] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#434c9d]/20 to-[#96cbc3]/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#434c9d]" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{quoteRequest.service?.title || 'Quote Request'}</DialogTitle>
              <DialogDescription className="text-base mt-1">
                View details and manage your quote request
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Service Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <Badge className={`${getStatusConfig(quoteRequest.status).bgColor} ${getStatusConfig(quoteRequest.status).color} ${getStatusConfig(quoteRequest.status).borderColor} border`}>
                {getStatusConfig(quoteRequest.status).icon}
                <span className="ml-1">{getStatusConfig(quoteRequest.status).label}</span>
              </Badge>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Requested Date</p>
              <p className="font-semibold text-gray-900">
                {quoteRequest.requested_date ? formatDate(quoteRequest.requested_date) : 'Not specified'}
              </p>
            </div>
          </div>

          {/* Date and Time */}
          {quoteRequest.requested_date && quoteRequest.requested_time && (
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Preferred Date & Time</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatDate(quoteRequest.requested_date)} at {formatTime(quoteRequest.requested_time)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quote */}
          {hasQuote && quote && (
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-green-900">Provider's Quote</h3>
                <Badge className="bg-green-600 text-white">Available</Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-green-700 mb-1">Price</p>
                  <p className="text-3xl font-bold text-green-800">{formatPrice(quote.price)}</p>
                </div>
                {quote.estimated_duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700">Estimated Duration: {quote.estimated_duration} minutes</p>
                  </div>
                )}
                {quote.notes && (
                  <div>
                    <p className="text-sm font-semibold text-green-900 mb-1">Provider's Notes:</p>
                    <p className="text-sm text-green-800 bg-white/50 p-3 rounded-lg">{quote.notes}</p>
                  </div>
                )}
                {quote.valid_until && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Valid until: {formatDate(quote.valid_until)}</span>
                  </div>
                )}
              </div>
              {onAcceptQuote && (
                <Button
                  onClick={onAcceptQuote}
                  disabled={acceptingQuote === quote.id}
                  className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 font-semibold"
                >
                  {acceptingQuote === quote.id ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Accepting Quote...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Accept Quote & Create Booking
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Special Instructions */}
          {quoteRequest.special_instructions && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Special Instructions</p>
              <p className="text-sm text-gray-700">{quoteRequest.special_instructions}</p>
            </div>
          )}

          {/* Service Address */}
          {quoteRequest.service_address && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <p className="text-sm font-semibold text-gray-900">Service Address</p>
              </div>
              <p className="text-sm text-gray-700">{quoteRequest.service_address}</p>
            </div>
          )}

          {/* Image */}
          {quoteRequest.image_url && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Attached Image</p>
              <img
                src={quoteRequest.image_url}
                alt="Quote request"
                className="w-full max-h-64 object-cover rounded-xl border border-gray-200"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 border-2"
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                setLoadingMessage(true);
                try {
                  // Get or create booking for this quote request
                  const response = await fetch(`/api/quotes/request/${quoteRequest.id}/booking`, {
                    cache: "no-store"
                  });

                  if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.booking_id) {
                      // Navigate to messages page with the booking_id
                      window.location.href = `/messages?booking_id=${data.booking_id}`;
                    } else {
                      // Fallback to general messages page
                      window.location.href = "/messages";
                    }
                  } else {
                    // Fallback to general messages page
                    window.location.href = "/messages";
                  }
                } catch (error) {
                  console.error("Error getting booking for quote request:", error);
                  // Fallback to general messages page
                  window.location.href = "/messages";
                } finally {
                  setLoadingMessage(false);
                }
              }}
              disabled={loadingMessage}
              className="flex-1 h-12 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white disabled:opacity-50"
            >
              {loadingMessage ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message Provider
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Empty State Component
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-24 bg-gradient-to-br from-white to-blue-50/30 rounded-3xl border-2 border-dashed border-gray-300">
      <div className="relative w-24 h-24 bg-gradient-to-br from-[#96cbc3]/30 to-[#434c9d]/30 rounded-full flex items-center justify-center mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 rounded-full blur-xl"></div>
        <div className="relative z-10 text-gray-400">
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-[#434c9d] bg-clip-text text-transparent mb-4">
        {title}
      </h3>
      <p className="text-lg text-gray-600 mb-10 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      <Link href="/services">
        <Button className="group relative bg-gradient-to-r from-[#434c9d] via-[#5a6bc4] to-[#96cbc3] hover:from-[#434c9d]/90 hover:via-[#5a6bc4]/90 hover:to-[#96cbc3]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold rounded-xl overflow-hidden">
          <span className="relative z-10 flex items-center gap-2">
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Browse Services
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </Button>
      </Link>
    </div>
  );
}

