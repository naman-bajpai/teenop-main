'use client';

import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  serviceTitle: string;
  onPaymentSuccess?: () => void;
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Payment form component that uses Stripe Elements
function PaymentForm({ 
  bookingId, 
  amount, 
  serviceTitle, 
  onPaymentSuccess, 
  onClose 
}: {
  bookingId: string;
  amount: number;
  serviceTitle: string;
  onPaymentSuccess?: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!stripe || !elements) {
      console.error('PaymentModal: Stripe or Elements not loaded');
      return;
    }

    setLoading(true);
    console.log('PaymentModal: Starting payment process for booking:', bookingId);

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

      setPaymentSuccess(true);
      toast({
        title: "Payment Successful!",
        description: `Payment of $${amount.toFixed(2)} for ${serviceTitle} has been completed.`,
      });

      setTimeout(() => {
        onPaymentSuccess?.();
        onClose();
        setPaymentSuccess(false);
      }, 2000);

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

  const handleClose = () => {
    if (!loading) {
      onClose();
      setPaymentSuccess(false);
    }
  };

  return (
    <div className="space-y-6">
      {paymentSuccess ? (
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Completed!
            </h3>
            <p className="text-gray-600">
              Your payment of ${amount.toFixed(2)} for {serviceTitle} has been processed successfully.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {serviceTitle}
            </h3>
            <p className="text-2xl font-bold text-green-600">
              ${amount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Secure payment powered by Stripe
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span>{serviceTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>Credit/Debit Card</span>
                </div>
              </div>
            </div>

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
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Main PaymentModal component that wraps the form with Stripe Elements
export function PaymentModal({ 
  isOpen, 
  onClose, 
  bookingId, 
  amount, 
  serviceTitle, 
  onPaymentSuccess 
}: PaymentModalProps) {
  const handleClose = () => {
    onClose();
  };

  const options: StripeElementsOptions = {
    mode: 'payment',
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Complete Payment
          </DialogTitle>
        </DialogHeader>
        
        {stripePromise && (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              bookingId={bookingId}
              amount={amount}
              serviceTitle={serviceTitle}
              onPaymentSuccess={onPaymentSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
        
        {!stripePromise && (
          <div className="text-center py-8">
            <p className="text-red-600">Stripe is not configured. Please contact support.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
