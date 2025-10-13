export interface Booking {
  id: string;
  service_id: string;
  user_id: string;
  status: BookingStatus;
  requested_date: string;
  requested_time: string;
  duration: number;
  total_price: number;
  special_instructions?: string | null;
  created_at: string;
  updated_at: string;
  // Service details (joined)
  service?: {
    title: string;
    description: string;
    price: number;
    pricing_model: string;
    location: string;
    category: string;
    user_id: string;
  };
  // User details (joined)
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export type BookingStatus = 
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export interface CreateBookingRequest {
  service_id: string;
  requested_date: string;
  requested_time: string;
  special_instructions?: string;
}

export interface BookingResponse {
  success: boolean;
  booking?: Booking;
  error?: string;
}
