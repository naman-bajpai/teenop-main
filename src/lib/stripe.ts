import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set. Please add it to your .env.local file.');
}

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Please add it to your .env.local file.');
}

// Initialize Stripe - using default API version (latest stable)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const getStripe = async () => {
  if (typeof window !== 'undefined') {
    const { loadStripe } = await import('@stripe/stripe-js');
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return null;
};
