export interface QuoteRequest {
  id: string;
  service_id: string;
  customer_id: string;
  status: QuoteRequestStatus;
  requested_date: string | null;
  requested_time: string | null;
  special_instructions: string | null;
  image_url: string | null;
  service_address: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: {
    id: string;
    title: string;
    description: string;
    pricing_model: string;
    user_id: string;
  };
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  quotes?: Quote[];
}

export interface Quote {
  id: string;
  quote_request_id: string;
  provider_id: string;
  price: number;
  estimated_duration: number | null;
  notes: string | null;
  valid_until: string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  quote_request?: QuoteRequest;
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export type QuoteRequestStatus = 
  | "pending"
  | "quoted"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type QuoteStatus = 
  | "pending"
  | "accepted"
  | "rejected"
  | "expired";

export interface CreateQuoteRequestRequest {
  service_id: string;
  requested_date: string;
  requested_time: string;
  special_instructions?: string;
  image_url?: string;
  service_address?: string;
}

export interface CreateQuoteRequest {
  quote_request_id: string;
  price: number;
  estimated_duration?: number;
  notes?: string;
  valid_until?: string;
}

export interface QuoteResponse {
  success: boolean;
  quote_request?: QuoteRequest;
  quote?: Quote;
  quote_requests?: QuoteRequest[];
  quotes?: Quote[];
  booking?: any;
  error?: string;
}

