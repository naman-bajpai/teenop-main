"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { QuoteRequest, Quote, CreateQuoteRequest } from "@/types/quote";
import {
  MessageSquare,
  Clock,
  Calendar,
  DollarSign,
  User,
  Send,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function ProviderQuoteRequestsPage() {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState<CreateQuoteRequest>({
    quote_request_id: "",
    price: 0,
    estimated_duration: undefined,
    notes: "",
    valid_until: "",
  });

  useEffect(() => {
    if (user) {
      fetchQuoteRequests();
    }
  }, [user, selectedStatus]);

  const fetchQuoteRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ role: "provider" });
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

  const handleOpenQuoteDialog = (request: QuoteRequest) => {
    setSelectedRequest(request);
    setQuoteForm({
      quote_request_id: request.id,
      price: 0,
      estimated_duration: undefined,
      notes: "",
      valid_until: "",
    });
    setIsQuoteDialogOpen(true);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quoteForm.price || quoteForm.price <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price",
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
          quote_request_id: quoteForm.quote_request_id,
          price: Number(quoteForm.price),
          estimated_duration: quoteForm.estimated_duration ? Number(quoteForm.estimated_duration) : undefined,
          notes: quoteForm.notes || undefined,
          valid_until: quoteForm.valid_until || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Quote Submitted",
          description: "Your quote has been sent to the customer",
        });
        setIsQuoteDialogOpen(false);
        fetchQuoteRequests();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit quote",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting quote:", error);
      toast({
        title: "Error",
        description: "Failed to submit quote",
        variant: "destructive",
      });
    } finally {
      setSubmittingQuote(false);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quote Requests</h1>
          <p className="text-gray-600">View and respond to quote requests for your services</p>
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
            <p className="text-gray-600">
              {selectedStatus !== "all"
                ? `No ${selectedStatus} quote requests found.`
                : "You haven't received any quote requests yet."}
            </p>
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
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {(request.customer as any)?.first_name} {(request.customer as any)?.last_name}
                      </div>
                      {request.requested_date && request.requested_time && (
                        <>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(request.requested_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {request.requested_time}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Find the booking associated with this quote request and navigate to messages
                          router.push("/messages");
                        }}
                        className="border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message Customer
                      </Button>
                      <Button
                        onClick={() => handleOpenQuoteDialog(request)}
                        className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Quote
                      </Button>
                    </div>
                  )}
                </div>

                {request.image_url && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Customer Reference Image:</p>
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
                      <strong>Customer Instructions:</strong> {request.special_instructions}
                    </p>
                  </div>
                )}

                {/* Existing Quotes */}
                {request.quotes && request.quotes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Your Quotes:</h4>
                    <div className="space-y-2">
                      {request.quotes.map((quote: Quote) => (
                        <div
                          key={quote.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            quote.status === "accepted"
                              ? "bg-green-50 border-green-200"
                              : quote.status === "rejected"
                              ? "bg-red-50 border-red-200 opacity-60"
                              : "bg-blue-50 border-blue-200"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <DollarSign className="w-5 h-5 text-green-600" />
                              <span className="text-xl font-bold text-gray-900">
                                ${quote.price.toFixed(2)}
                              </span>
                              {quote.estimated_duration && (
                                <span className="text-sm text-gray-600">
                                  ({quote.estimated_duration} min)
                                </span>
                              )}
                            </div>
                            {quote.status === "accepted" && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Accepted
                              </Badge>
                            )}
                            {quote.status === "rejected" && (
                              <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                            )}
                            {quote.status === "pending" && (
                              <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                            )}
                          </div>
                          {quote.notes && (
                            <p className="text-sm text-gray-700 mt-2">{quote.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Submit Quote Dialog */}
        <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Quote</DialogTitle>
              <DialogDescription>
                Provide a quote for this service request
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <form onSubmit={handleSubmitQuote} className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Service:</strong> {(selectedRequest.service as any)?.title}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Customer:</strong> {(selectedRequest.customer as any)?.first_name} {(selectedRequest.customer as any)?.last_name}
                  </p>
                  {selectedRequest.requested_date && selectedRequest.requested_time && (
                    <p className="text-sm text-gray-600">
                      <strong>Requested:</strong> {new Date(selectedRequest.requested_date).toLocaleDateString()} at {selectedRequest.requested_time}
                    </p>
                  )}
                </div>

                {selectedRequest.image_url && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Customer Reference Image:</p>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={selectedRequest.image_url}
                        alt="Quote request reference"
                        className="w-full max-h-48 object-contain bg-gray-50"
                        onClick={() => window.open(selectedRequest.image_url!, '_blank')}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}

                {selectedRequest.special_instructions && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Customer Instructions:</strong> {selectedRequest.special_instructions}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quoteForm.price || ""}
                    onChange={(e) => setQuoteForm((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    value={quoteForm.estimated_duration || ""}
                    onChange={(e) => setQuoteForm((prev) => ({ ...prev, estimated_duration: parseInt(e.target.value) || undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes / Terms</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional details, terms, or conditions..."
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="valid_until">Valid Until (optional)</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={quoteForm.valid_until}
                    onChange={(e) => setQuoteForm((prev) => ({ ...prev, valid_until: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Quote will expire after this date</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsQuoteDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingQuote}
                    className="flex-1 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90"
                  >
                    {submittingQuote ? "Submitting..." : "Submit Quote"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

