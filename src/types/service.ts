export interface Service {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category: string;
  status: string;
  duration: number;
  education?: string | null;
  qualifications?: string | null;
  address?: string | null;
  pricing_model: string;
  banner_url?: string | null;
  created_at: string;
  rating?: number | null;
  total_bookings: number;
  provider_name?: string | null;
}

export type ServiceCategory = 
  | "pet_care"
  | "lawn_care"
  | "tutoring"
  | "cleaning"
  | "tech_support"
  | "delivery"
  | "other";
