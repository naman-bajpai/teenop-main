'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentButtonProps {
  bookingId: string;
  amount: number;
  serviceTitle: string;
  onPaymentSuccess?: () => void;
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Payment form component for the button
function PaymentForm({ 
  bookingId, 
  amount, 
  serviceTitle, 
  onPaymentSuccess 
}: PaymentButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!stripe || !elements) {
      console.error('PaymentButton: Stripe or Elements not loaded');
      return;
    }

    setLoading(true);
    console.log('PaymentButton: Starting payment process for booking:', bookingId);

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // Get the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm the payment with Stripe using the card element
      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        console.error('Stripe payment error:', error);
        // Check for specific error types
        if (error.message?.includes('Invalid API Key')) {
          throw new Error('Invalid Stripe API key. Please check your NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.local');
        }
        if (error.message?.includes('test mode') || error.message?.includes('live mode')) {
          throw new Error('Stripe key mode mismatch. Ensure both publishable and secret keys are from the same mode (test or live).');
        }
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on our backend
        const confirmResponse = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        const confirmData = await confirmResponse.json();

        if (!confirmData.success) {
          throw new Error(confirmData.error || 'Failed to confirm payment');
        }
      } else {
        throw new Error('Payment was not successful');
      }

      toast({
        title: "Payment Successful!",
        description: `Payment of $${amount.toFixed(2)} for ${serviceTitle} has been completed.`,
      });

      onPaymentSuccess?.();

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Card Element */}
      <div className="border border-gray-300 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <CardElement
          options={{
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
          }}
        />
      </div>

      <Button
        onClick={handlePayment}
        disabled={loading || !stripe}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay Now - ${amount.toFixed(2)}
          </>
        )}
      </Button>
    </div>
  );
}

// Main PaymentButton component that wraps the form with Stripe Elements
export function PaymentButton({ 
  bookingId, 
  amount, 
  serviceTitle, 
  onPaymentSuccess 
}: PaymentButtonProps) {
  const options = {
    mode: 'payment' as const,
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
  };

  if (!stripePromise) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600">Stripe is not configured. Please contact support.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        bookingId={bookingId}
        amount={amount}
        serviceTitle={serviceTitle}
        onPaymentSuccess={onPaymentSuccess}
      />
    </Elements>
  );
}
