"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rating } from "@/components/ui/rating";
import { Star, DollarSign, CheckCircle, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { TipPaymentModal } from "@/components/payments/TipPaymentModal";

interface ReviewFormProps {
  bookingId: string;
  serviceTitle: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({ bookingId, serviceTitle, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [tipAmount, setTipAmount] = useState<string>("");
  const [tipPaid, setTipPaid] = useState(false);
  const [paidTipAmount, setPaidTipAmount] = useState<number>(0);
  const [isTipPaymentModalOpen, setIsTipPaymentModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTipSection, setShowTipSection] = useState(true);
  const { toast } = useToast();

  const handleTipPaymentSuccess = (amount: number) => {
    setTipPaid(true);
    setPaidTipAmount(amount);
    setTipAmount(amount.toString());
    toast({
      title: "Tip Payment Successful",
      description: `Your tip of $${amount.toFixed(2)} has been processed!`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    // If tip amount is entered but not paid, show payment modal
    const tipValue = tipAmount ? parseFloat(tipAmount) : 0;
    if (tipValue > 0 && !tipPaid) {
      setIsTipPaymentModalOpen(true);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          rating: rating,
          review_text: reviewText.trim() || undefined,
          tip_amount: tipPaid ? paidTipAmount : (tipValue > 0 ? tipValue : 0),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit review");
      }

      toast({
        title: "Review Submitted",
        description: tipPaid
          ? `Thank you for your feedback and tip of $${paidTipAmount.toFixed(2)}!`
          : "Thank you for your feedback!",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Review for: {serviceTitle}
        </h3>
        <p className="text-sm text-gray-600">
          Share your experience and help the teen provider improve!
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Rating *
        </Label>
        <Rating
          rating={rating}
          interactive={true}
          onRatingChange={setRating}
          size="lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          {rating === 0 && "Click to rate"}
          {rating === 1 && "Poor"}
          {rating === 2 && "Fair"}
          {rating === 3 && "Good"}
          {rating === 4 && "Very Good"}
          {rating === 5 && "Excellent"}
        </p>
      </div>

      <div>
        <Label htmlFor="review-text" className="text-sm font-medium text-gray-700 mb-2 block">
          Review (Optional)
        </Label>
        <Textarea
          id="review-text"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this service..."
          rows={4}
          className="w-full"
        />
      </div>

      <div>
        {!showTipSection ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowTipSection(true)}
            className="flex items-center gap-2 text-gray-500 hover:text-[#434c9d] pl-0"
          >
            <DollarSign className="w-4 h-4" />
            Add a Tip (Optional)
          </Button>
        ) : (
          <div className="relative border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <button
              type="button"
              onClick={() => {
                setShowTipSection(false);
                setTipAmount("");
              }}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Remove tip"
            >
              <X className="w-4 h-4" />
            </button>
            <Label htmlFor="tip-amount" className="text-sm font-medium text-gray-700 mb-2 block">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Tip Amount (Optional)</span>
                {tipPaid && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
            </Label>
            <div className="space-y-2">
              <Input
                id="tip-amount"
                type="number"
                min="0"
                step="0.01"
                value={tipAmount}
                onChange={(e) => {
                  setTipAmount(e.target.value);
                  if (tipPaid && parseFloat(e.target.value) !== paidTipAmount) {
                    setTipPaid(false);
                  }
                }}
                placeholder="0.00"
                className="w-full bg-white"
                disabled={tipPaid}
              />
              {tipPaid && (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Tip of ${paidTipAmount.toFixed(2)} paid successfully
                </p>
              )}
              {!tipPaid && tipAmount && parseFloat(tipAmount) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTipPaymentModalOpen(true)}
                  className="w-full"
                >
                  Pay Tip
                </Button>
              )}
              {!tipPaid && (
                <p className="text-xs text-gray-500">
                  Show your appreciation with a tip (optional)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting || rating === 0}
          className="flex-1 bg-[#434c9d] hover:bg-[#434c9d]/90"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </Button>
      </div>

      <TipPaymentModal
        isOpen={isTipPaymentModalOpen}
        onClose={() => setIsTipPaymentModalOpen(false)}
        bookingId={bookingId}
        tipAmount={tipAmount ? parseFloat(tipAmount) : 0}
        serviceTitle={serviceTitle}
        onPaymentSuccess={handleTipPaymentSuccess}
      />
    </form>
  );
}

