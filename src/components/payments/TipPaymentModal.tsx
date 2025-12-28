"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface TipPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  tipAmount: number;
  serviceTitle: string;
  onPaymentSuccess: (tipAmount: number) => void;
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function TipPaymentForm({ 
  bookingId, 
  tipAmount, 
  serviceTitle, 
  onPaymentSuccess, 
  onClose 
}: {
  bookingId: string;
  tipAmount: number;
  serviceTitle: string;
  onPaymentSuccess: (tipAmount: number) => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!stripe || !elements) {
      console.error('TipPaymentModal: Stripe or Elements not loaded');
      return;
    }

    setLoading(true);

    try {
      // Create tip payment intent
      const response = await fetch('/api/payments/tip-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId, tipAmount }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create tip payment intent');
      }

      // Get the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        console.error('Stripe tip payment error:', error);
        throw new Error(error.message || 'Tip payment failed');
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm the tip payment on the server
        const confirmResponse = await fetch('/api/payments/tip-confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        const confirmData = await confirmResponse.json();

        if (!confirmData.success) {
          throw new Error(confirmData.error || 'Failed to confirm tip payment');
        }

        toast({
          title: "Tip Payment Successful",
          description: `Your tip of $${tipAmount.toFixed(2)} has been processed successfully!`,
        });

        onPaymentSuccess(tipAmount);
        onClose();
      }
    } catch (error: any) {
      console.error('Error processing tip payment:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process tip payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Tip Amount:</strong> ${tipAmount.toFixed(2)}
        </p>
        <p className="text-xs text-blue-700 mt-1">
          This tip will be sent directly to the service provider.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handlePayment}
          disabled={loading || !stripe || !elements}
          className="flex-1 bg-[#434c9d] hover:bg-[#434c9d]/90"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${tipAmount.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}

export function TipPaymentModal({ 
  isOpen, 
  onClose, 
  bookingId, 
  tipAmount, 
  serviceTitle, 
  onPaymentSuccess 
}: TipPaymentModalProps) {
  const options: StripeElementsOptions = {
    mode: 'payment',
    amount: Math.round(tipAmount * 100), // Convert to cents
    currency: 'usd',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Tip Payment
          </DialogTitle>
          <DialogDescription className="text-center">
            Show your appreciation with a tip for {serviceTitle}
          </DialogDescription>
        </DialogHeader>
        
        {stripePromise ? (
          <Elements stripe={stripePromise} options={options}>
            <TipPaymentForm
              bookingId={bookingId}
              tipAmount={tipAmount}
              serviceTitle={serviceTitle}
              onPaymentSuccess={onPaymentSuccess}
              onClose={onClose}
            />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-600">Stripe is not configured. Please contact support.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

