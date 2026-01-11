export interface ServiceImage {
  id: string;
  service_id: string;
  url: string;
  is_primary: boolean;
  created_at: string;
}

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
  delivery_method?: string | null;
  location_type?: string | null;
  banner_url?: string | null;
  availability?: Record<string, Array<{ start: string; end: string }>> | null;
  created_at: string;
  rating?: number | null;
  total_bookings: number;
  provider_name?: string | null;
  provider_city?: string | null;
  provider_state?: string | null;
  images?: ServiceImage[];
}

export type ServiceCategory =
  | "pet_care"
  | "lawn_care"
  | "tutoring"
  | "cleaning"
  | "tech_support"
  | "delivery"
  | "art_commissions"
  | "beauty"
  | "photography"
  | "graphic_design"
  | "other";
