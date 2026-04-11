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
  Send,
  Info
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/use-toast";
import { QuoteRequest, Quote, CreateQuoteRequest } from "@/types/quote";
import { getQuoteReferenceImageUrls } from "@/lib/quote-reference-images";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);
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

  const handleDenyQuoteRequest = async (quoteRequestId: string) => {
    try {
      setCancellingRequest(quoteRequestId);
      const response = await fetch(`/api/quotes/request/${quoteRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deny quote request");
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Quote Request Denied",
          description: "The quote request has been cancelled.",
        });
        fetchQuoteRequests(true);
        if (selectedQuoteRequest?.id === quoteRequestId) {
          setIsQuoteDialogOpen(false);
          setSelectedQuoteRequest(null);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to deny quote request",
        variant: "destructive",
      });
    } finally {
      setCancellingRequest(null);
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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#434c9d]/10 text-[#434c9d] rounded-full px-4 py-1.5">
                <FileText className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">Provider Dashboard</span>
              </div>
              <h1 className="page-title text-gray-900">
                Quote <span className="text-[#434c9d]">Requests</span>
              </h1>
              <p className="text-lg text-gray-500 font-medium max-w-2xl leading-relaxed">
                Review and respond to custom service requests from your neighbors.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 pb-6 border-b border-gray-100">
              <TabsList className="bg-gray-100/50 p-1.5 rounded-2xl h-auto flex flex-wrap justify-center">
                {[
                  { value: "pending", label: "Pending", count: pendingRequests.length, color: "text-yellow-600" },
                  { value: "accepted", label: "Accepted", count: acceptedRequests.length, color: "text-green-600" },
                  { value: "other", label: "Other", count: otherRequests.length, color: "text-gray-500" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-xl px-8 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    {tab.label}
                    <span className={cn("ml-2 px-2 py-0.5 rounded-lg bg-current/10 opacity-50", tab.color)}>{tab.count}</span>  
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Pending Tab */}
            <TabsContent value="pending" className="mt-0 outline-none">
              {loading ? (
                <div className="py-24 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-[#434c9d] mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading quote requests...</p>
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        onMessage={() => router.push(qr.booking_id ? `/messages?booking_id=${qr.booking_id}` : "/messages")}
                        onDeny={() => handleDenyQuoteRequest(qr.id)}
                        cancellingRequest={cancellingRequest}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<AlertCircle className="w-12 h-12" />}
                  title="No Pending Requests"
                  description="You don't have any pending quote requests at the moment."
                />
              )}
            </TabsContent>

            {/* Accepted Tab */}
            <TabsContent value="accepted" className="mt-0 outline-none">
              {acceptedRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        onMessage={() => router.push(qr.booking_id ? `/messages?booking_id=${qr.booking_id}` : "/messages")}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<CheckCircle className="w-12 h-12" />}
                  title="No Accepted Quotes"
                  description="Accepted quotes will appear here."
                />
              )}
            </TabsContent>

            {/* Other Tab */}
            <TabsContent value="other" className="mt-0 outline-none">
              {otherRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        onMessage={() => router.push(qr.booking_id ? `/messages?booking_id=${qr.booking_id}` : "/messages")}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<XCircle className="w-12 h-12" />}
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
            onDeny={selectedQuoteRequest ? () => handleDenyQuoteRequest(selectedQuoteRequest.id) : undefined}
            cancellingRequest={cancellingRequest}
            onMessageCustomer={async () => {
              let bid = selectedQuoteRequest.booking_id;
              if (!bid) {
                try {
                  const res = await fetch(`/api/quotes/request/${selectedQuoteRequest.id}/booking`);
                  const data = await res.json();
                  if (data.success && data.booking_id) bid = data.booking_id;
                } catch (_) {}
              }
              if (bid) router.push(`/messages?booking_id=${bid}`);
              else router.push("/messages");
            }}
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
  onMessage,
  onDeny,
  cancellingRequest
}: {
  quoteRequest: QuoteRequest;
  statusConfig: ReturnType<typeof getStatusConfig>;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatPrice: (price: number) => string;
  onViewDetails: () => void;
  onMessage: () => void;
  onDeny?: () => void;
  cancellingRequest?: string | null;
}) {
  const hasQuote = quoteRequest.quotes && quoteRequest.quotes.length > 0;
  const customerName = quoteRequest.customer 
    ? `${quoteRequest.customer.first_name} ${quoteRequest.customer.last_name}`
    : "Customer";
  const refImageUrls = getQuoteReferenceImageUrls(quoteRequest);

  return (
    <div className="group bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full">
      {/* Header Section */}
      <div className="p-8 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-2">
            <Badge className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-none shadow-sm",
              statusConfig.bgColor,
              statusConfig.color
            )}>
              <span className="flex items-center gap-1.5">{statusConfig.icon} {statusConfig.label}</span>
            </Badge>
            <h3 className="text-xl font-black text-gray-900 group-hover:text-[#434c9d] transition-colors line-clamp-1 leading-tight">
              {quoteRequest.service?.title || 'Service'}
            </h3>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <User className="w-3 h-3" />
              <span>{customerName}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          {quoteRequest.requested_date && quoteRequest.requested_time && (
            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Calendar className="w-4 h-4 text-[#96cbc3]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested For</span>
                <span className="text-xs font-bold text-gray-600">
                  {formatDate(quoteRequest.requested_date)} at {formatTime(quoteRequest.requested_time)}
                </span>
              </div>
            </div>
          )}
        </div>

        {hasQuote && (
          <div className="mb-6 p-4 bg-[#96cbc3]/10 rounded-2xl border border-[#96cbc3]/20">
            <p className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest mb-1">Your Quote</p>
            <p className="text-2xl font-black text-gray-900">{formatPrice(quoteRequest.quotes![0].price)}</p>
          </div>
        )}

        {refImageUrls.length > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 relative">
            <img
              src={refImageUrls[0]}
              alt=""
              className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {refImageUrls.length > 1 && (
              <span className="absolute bottom-2 right-2 rounded-lg bg-black/70 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1">
                +{refImageUrls.length - 1}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto p-8 pt-0">
        <div className="flex flex-col gap-2 pt-6 border-t border-gray-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
              onClick={onViewDetails}
            >
              <FileText className="w-4 h-4 mr-2" /> {hasQuote ? "View" : "Respond"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
              onClick={onMessage}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Message
            </Button>
          </div>
          {onDeny && (quoteRequest.status === "pending" || quoteRequest.status === "quoted") && (
            <Button
              variant="outline"
              disabled={cancellingRequest === quoteRequest.id}
              className="w-full rounded-xl font-bold border-gray-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all h-11"
              onClick={onDeny}
            >
              {cancellingRequest === quoteRequest.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><XCircle className="w-4 h-4 mr-2" /> Deny Request</>
              )}
            </Button>
          )}
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
  formatPrice,
  onDeny,
  cancellingRequest,
  onMessageCustomer
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
  onDeny?: () => void;
  cancellingRequest?: string | null;
  onMessageCustomer?: () => void | Promise<void>;
}) {
  const hasQuote = quoteRequest.quotes && quoteRequest.quotes.length > 0;
  const customerName = quoteRequest.customer 
    ? `${quoteRequest.customer.first_name} ${quoteRequest.customer.last_name}`
    : "Customer";
  const refImageUrls = getQuoteReferenceImageUrls(quoteRequest);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-[40px] shadow-2xl">
        <div className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] p-8 text-white">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black">{quoteRequest.service?.title || 'Quote Request'}</DialogTitle>
                <DialogDescription className="text-white/80 text-lg font-medium">
                  Review request details and submit your quote
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
          <div className="space-y-10">
            {/* Customer Info Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                <div className="w-10 h-10 bg-[#434c9d]/10 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-[#434c9d]" />
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Customer Information</h3>
              </div>
              <div className="p-6 bg-gray-50 rounded-[24px] border border-gray-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                  <User className="w-8 h-8 text-gray-300" />
                </div>
                <div>
                  <p className="text-xl font-black text-gray-900">{customerName}</p>
                  {quoteRequest.customer?.email && (
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{quoteRequest.customer.email}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Logistics Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Logistics</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quoteRequest.requested_date && quoteRequest.requested_time && (
                  <div className="p-6 bg-blue-50 rounded-[24px] border border-blue-100 space-y-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">Requested For</span>
                    <p className="text-lg font-black text-gray-900">
                      {formatDate(quoteRequest.requested_date)} at {formatTime(quoteRequest.requested_time)}
                    </p>
                  </div>
                )}
                {quoteRequest.service_address && (
                  <div className="p-6 bg-orange-50 rounded-[24px] border border-orange-100 space-y-2">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.15em]">Service Address</span>
                    <p className="text-lg font-black text-gray-900 leading-tight">{quoteRequest.service_address}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Special Instructions */}
            {quoteRequest.special_instructions && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Info className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Special Instructions</h3>
                </div>
                <div className="p-6 bg-gray-50 rounded-[24px] border border-gray-100">
                  <p className="text-base font-medium text-gray-600 leading-relaxed italic">
                    &quot;{quoteRequest.special_instructions}&quot;
                  </p>
                </div>
              </section>
            )}

            {/* Reference images */}
            {refImageUrls.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Attached Visuals</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {refImageUrls.map((url, i) => (
                    <a
                      key={`${url}-${i}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[32px] overflow-hidden border border-gray-100 shadow-lg block hover:opacity-95 transition-opacity"
                    >
                      <img
                        src={url}
                        alt={`Reference ${i + 1}`}
                        className="w-full max-h-72 object-cover"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Previous Quote Section */}
            {hasQuote && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Your Previous Quote</h3>
                </div>
                <div className="p-8 bg-[#96cbc3]/10 rounded-[32px] border-2 border-[#96cbc3]/20 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest mb-1">Price</p>
                      <p className="text-4xl font-black text-gray-900">{formatPrice(quoteRequest.quotes![0].price)}</p>
                    </div>
                    {quoteRequest.quotes![0].estimated_duration && (
                      <div>
                        <p className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest mb-1">Estimated Duration</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <p className="text-xl font-black text-gray-900">{quoteRequest.quotes![0].estimated_duration} minutes</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {quoteRequest.quotes![0].notes && (
                    <div className="pt-6 border-t border-[#96cbc3]/20">
                      <p className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest mb-2">Quote Notes</p>
                      <p className="text-base font-medium text-gray-700 bg-white/50 p-4 rounded-2xl leading-relaxed">
                        {quoteRequest.quotes![0].notes}
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-bold text-[#96cbc3] uppercase tracking-widest">You can submit a new quote below to update this one.</p>
                </div>
              </section>
            )}

            {/* Quote Submission Form */}
            {(quoteRequest.status === "pending" || quoteRequest.status === "quoted") && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-[#434c9d]/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-[#434c9d]" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">
                    {hasQuote ? "Update Your Quote" : "Submit Your Quote"}
                  </h3>
                </div>
                <form onSubmit={onSubmitQuote} className="space-y-8 p-8 bg-gray-50 rounded-[32px] border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Price ($) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={quoteForm.price || ""}
                          onChange={(e) => onQuoteFormChange({ ...quoteForm, price: parseFloat(e.target.value) || 0 })}
                          required
                          className="h-14 pl-12 rounded-2xl bg-white border-none focus:ring-2 focus:ring-[#434c9d]/10 transition-all text-xl font-black"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Est. Duration (Min)</Label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="number"
                          min="1"
                          value={quoteForm.estimated_duration || ""}
                          onChange={(e) => onQuoteFormChange({ ...quoteForm, estimated_duration: parseInt(e.target.value) || undefined })}
                          className="h-14 pl-12 rounded-2xl bg-white border-none focus:ring-2 focus:ring-[#434c9d]/10 transition-all text-xl font-black"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Additional Notes</Label>
                    <Textarea
                      value={quoteForm.notes || ""}
                      onChange={(e) => onQuoteFormChange({ ...quoteForm, notes: e.target.value })}
                      rows={4}
                      className="min-h-[120px] rounded-[24px] bg-white border-none focus:ring-2 focus:ring-[#434c9d]/10 transition-all text-base font-medium resize-none leading-relaxed p-4"
                      placeholder="Add any additional details about your quote..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Quote Valid Until</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="date"
                        value={quoteForm.valid_until || ""}
                        onChange={(e) => onQuoteFormChange({ ...quoteForm, valid_until: e.target.value || undefined })}
                        min={new Date().toISOString().split("T")[0]}
                        className="h-14 pl-12 rounded-2xl bg-white border-none focus:ring-2 focus:ring-[#434c9d]/10 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingQuote || quoteForm.price <= 0}
                    className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl h-14 font-black shadow-xl shadow-[#434c9d]/20 transition-all active:scale-95"
                  >
                    {submittingQuote ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <><Send className="w-5 h-5 mr-2" /> {hasQuote ? "Update Quote" : "Submit Quote"}</>
                    )}
                  </Button>
                </form>
              </section>
            )}
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 flex flex-col sm:flex-row gap-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} className="h-14 rounded-2xl font-black px-10">Close</Button>
          <Button
            onClick={() => onMessageCustomer?.()}
            className="flex-1 bg-white hover:bg-gray-50 text-[#434c9d] border-2 border-[#434c9d] rounded-2xl h-14 font-black transition-all active:scale-95"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Message Customer
          </Button>
          {onDeny && (quoteRequest.status === "pending" || quoteRequest.status === "quoted") && (
            <Button
              variant="outline"
              onClick={onDeny}
              disabled={cancellingRequest === quoteRequest.id}
              className="flex-1 rounded-2xl font-black border-red-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all h-14"
            >
              {cancellingRequest === quoteRequest.id ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <><XCircle className="w-6 h-6 mr-2" /> Deny Request</>
              )}
            </Button>
          )}
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

