"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  User,
  Loader2,
  Send
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/use-toast";
import { QuoteRequest, Quote, CreateQuoteRequest } from "@/types/quote";
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
    }
  };
  return configs[status] || configs.pending;
}

// Component that uses useSearchParams - must be wrapped in Suspense
function QuoteRequestsContent() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<QuoteRequest | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState<CreateQuoteRequest>({
    quote_request_id: "",
    price: 0,
    estimated_duration: undefined,
    notes: "",
    valid_until: undefined
  });

  useEffect(() => {
    if (user) {
      fetchQuoteRequests();
    }
  }, [user]);

  useEffect(() => {
    const requestId = searchParams.get("request");
    if (requestId && quoteRequests.length > 0) {
      const request = quoteRequests.find(qr => qr.id === requestId);
      if (request) {
        setSelectedQuoteRequest(request);
        setIsQuoteDialogOpen(true);
      }
    }
  }, [searchParams, quoteRequests]);

  const fetchQuoteRequests = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const response = await fetch("/api/quotes/request?role=provider", fetchOptions);
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

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteRequest) return;

    if (quoteForm.price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than $0",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingQuote(true);
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quoteForm,
          quote_request_id: selectedQuoteRequest.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit quote");
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Quote Submitted!",
          description: "Your quote has been sent to the customer.",
        });
        setIsQuoteDialogOpen(false);
        setSelectedQuoteRequest(null);
        setQuoteForm({
          quote_request_id: "",
          price: 0,
          estimated_duration: undefined,
          notes: "",
          valid_until: undefined
        });
        fetchQuoteRequests(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit quote",
        variant: "destructive",
      });
    } finally {
      setSubmittingQuote(false);
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-[#434c9d]/20 to-[#96cbc3]/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-[#434c9d]" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
                    Quote Requests
                  </h1>
                  <p className="text-lg text-gray-600 mt-1">
                    Review and respond to quote requests for your services
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-8">
              <TabsList className="inline-flex w-full sm:grid sm:grid-cols-3 bg-gray-100 p-1 rounded-xl h-auto min-w-max sm:min-w-0">
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
                  value="other" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3 px-4 text-sm"
                >
                  Other ({otherRequests.length})
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
                      <ProviderQuoteRequestCard
                        key={qr.id}
                        quoteRequest={qr}
                        statusConfig={statusConfig}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        formatPrice={formatPrice}
                        onViewDetails={() => {
                          setSelectedQuoteRequest(qr);
                          setQuoteForm({
                            quote_request_id: qr.id,
                            price: 0,
                            estimated_duration: undefined,
                            notes: "",
                            valid_until: undefined
                          });
                          setIsQuoteDialogOpen(true);
                        }}
                        onMessage={() => router.push("/messages")}
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
                      <ProviderQuoteRequestCard
                        key={qr.id}
                        quoteRequest={qr}
                        statusConfig={statusConfig}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        formatPrice={formatPrice}
                        onViewDetails={() => {
                          setSelectedQuoteRequest(qr);
                          setIsQuoteDialogOpen(true);
                        }}
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
            <TabsContent value="other" className="mt-6">
              {otherRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherRequests.map((qr) => {
                    const statusConfig = getStatusConfig(qr.status);
                    return (
                      <ProviderQuoteRequestCard
                        key={qr.id}
                        quoteRequest={qr}
                        statusConfig={statusConfig}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        formatPrice={formatPrice}
                        onViewDetails={() => {
                          setSelectedQuoteRequest(qr);
                          setIsQuoteDialogOpen(true);
                        }}
                        onMessage={() => router.push("/messages")}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<XCircle className="w-16 h-16" />}
                  title="No Other Requests"
                  description="Rejected or expired requests will appear here."
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Quote Request Details & Submit Quote Dialog */}
        {selectedQuoteRequest && (
          <QuoteRequestDetailsDialog
            quoteRequest={selectedQuoteRequest}
            isOpen={isQuoteDialogOpen}
            onClose={() => {
              setIsQuoteDialogOpen(false);
              setSelectedQuoteRequest(null);
            }}
            quoteForm={quoteForm}
            onQuoteFormChange={setQuoteForm}
            onSubmitQuote={handleSubmitQuote}
            submittingQuote={submittingQuote}
            formatDate={formatDate}
            formatTime={formatTime}
            formatPrice={formatPrice}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Main component that wraps the content in Suspense
export default function ProviderQuoteRequestsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout user={null}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#434c9d] mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <QuoteRequestsContent />
    </Suspense>
  );
}

// Provider Quote Request Card Component
function ProviderQuoteRequestCard({
  quoteRequest,
  statusConfig,
  formatDate,
  formatTime,
  formatPrice,
  onViewDetails,
  onMessage
}: {
  quoteRequest: QuoteRequest;
  statusConfig: ReturnType<typeof getStatusConfig>;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatPrice: (price: number) => string;
  onViewDetails: () => void;
  onMessage: () => void;
}) {
  const hasQuote = quoteRequest.quotes && quoteRequest.quotes.length > 0;
  const customerName = quoteRequest.customer 
    ? `${quoteRequest.customer.first_name} ${quoteRequest.customer.last_name}`
    : "Customer";

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
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{customerName}</span>
            </div>
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

        {hasQuote && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-900 mb-1">Your Quote:</p>
            <p className="text-lg font-bold text-green-700">{formatPrice(quoteRequest.quotes![0].price)}</p>
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

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onViewDetails}
            className="flex-1 border-2 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            {hasQuote ? "View" : "Respond"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onMessage}
            className="flex-1 border-2 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
        </div>
      </div>
    </div>
  );
}

// Quote Request Details Dialog with Quote Submission Form
function QuoteRequestDetailsDialog({
  quoteRequest,
  isOpen,
  onClose,
  quoteForm,
  onQuoteFormChange,
  onSubmitQuote,
  submittingQuote,
  formatDate,
  formatTime,
  formatPrice
}: {
  quoteRequest: QuoteRequest;
  isOpen: boolean;
  onClose: () => void;
  quoteForm: CreateQuoteRequest;
  onQuoteFormChange: (form: CreateQuoteRequest) => void;
  onSubmitQuote: (e: React.FormEvent) => void;
  submittingQuote: boolean;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatPrice: (price: number) => string;
}) {
  const hasQuote = quoteRequest.quotes && quoteRequest.quotes.length > 0;
  const customerName = quoteRequest.customer 
    ? `${quoteRequest.customer.first_name} ${quoteRequest.customer.last_name}`
    : "Customer";

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
                Review request details and submit your quote
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="font-semibold text-gray-900">{customerName}</p>
                {quoteRequest.customer?.email && (
                  <p className="text-sm text-gray-600">{quoteRequest.customer.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Date and Time */}
          {quoteRequest.requested_date && quoteRequest.requested_time && (
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Requested Date & Time</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatDate(quoteRequest.requested_date)} at {formatTime(quoteRequest.requested_time)}
                  </p>
                </div>
              </div>
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

          {/* Existing Quote */}
          {hasQuote && (
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <h3 className="text-xl font-bold text-green-900 mb-4">Your Previous Quote</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-green-700 mb-1">Price</p>
                  <p className="text-3xl font-bold text-green-800">{formatPrice(quoteRequest.quotes![0].price)}</p>
                </div>
                {quoteRequest.quotes![0].estimated_duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700">Estimated Duration: {quoteRequest.quotes![0].estimated_duration} minutes</p>
                  </div>
                )}
                {quoteRequest.quotes![0].notes && (
                  <div>
                    <p className="text-sm font-semibold text-green-900 mb-1">Notes:</p>
                    <p className="text-sm text-green-800 bg-white/50 p-3 rounded-lg">{quoteRequest.quotes![0].notes}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-green-600 mt-4">You can submit a new quote to update this one.</p>
            </div>
          )}

          {/* Quote Submission Form */}
          {quoteRequest.status === "pending" || quoteRequest.status === "quoted" ? (
            <form onSubmit={onSubmitQuote} className="space-y-4 p-6 bg-gradient-to-r from-[#434c9d]/5 to-[#96cbc3]/5 rounded-xl border-2 border-[#434c9d]/20">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{hasQuote ? "Update Quote" : "Submit Quote"}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quote-price" className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#434c9d]" />
                    Price *
                  </Label>
                  <Input
                    id="quote-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quoteForm.price || ""}
                    onChange={(e) => onQuoteFormChange({ ...quoteForm, price: parseFloat(e.target.value) || 0 })}
                    required
                    className="h-11 border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-duration" className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#434c9d]" />
                    Estimated Duration (minutes)
                  </Label>
                  <Input
                    id="quote-duration"
                    type="number"
                    min="1"
                    value={quoteForm.estimated_duration || ""}
                    onChange={(e) => onQuoteFormChange({ ...quoteForm, estimated_duration: parseInt(e.target.value) || undefined })}
                    className="h-11 border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-notes" className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#434c9d]" />
                  Notes
                </Label>
                <Textarea
                  id="quote-notes"
                  value={quoteForm.notes || ""}
                  onChange={(e) => onQuoteFormChange({ ...quoteForm, notes: e.target.value })}
                  rows={4}
                  className="border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 resize-none"
                  placeholder="Add any additional details about your quote..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-valid-until" className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#434c9d]" />
                  Valid Until
                </Label>
                <Input
                  id="quote-valid-until"
                  type="date"
                  value={quoteForm.valid_until || ""}
                  onChange={(e) => onQuoteFormChange({ ...quoteForm, valid_until: e.target.value || undefined })}
                  min={new Date().toISOString().split("T")[0]}
                  className="h-11 border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                />
                <p className="text-xs text-gray-500">Optional: Set an expiration date for this quote</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 border-2"
                  disabled={submittingQuote}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingQuote || quoteForm.price <= 0}
                  className="flex-1 h-12 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white shadow-lg hover:shadow-xl transition-all font-semibold"
                >
                  {submittingQuote ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {hasQuote ? "Update Quote" : "Submit Quote"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : null}

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
              onClick={() => {
                if (quoteRequest.booking_id) {
                  window.location.href = `/messages?booking_id=${quoteRequest.booking_id}`;
                } else {
                  // Fallback: try to find booking by quote request ID in special_instructions
                  window.location.href = "/messages";
                }
              }}
              className="flex-1 h-12 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Message Customer
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
    </div>
  );
}

