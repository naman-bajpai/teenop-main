export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          duration: number
          id: string
          payment_completed_at: string | null
          payment_intent_id: string | null
          platform_fee: number
          quote_id: string | null
          requested_date: string
          requested_time: string
          service_id: string
          service_price: number
          special_instructions: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration: number
          id?: string
          payment_completed_at?: string | null
          payment_intent_id?: string | null
          platform_fee?: number
          quote_id?: string | null
          requested_date: string
          requested_time: string
          service_id: string
          service_price: number
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          payment_completed_at?: string | null
          payment_intent_id?: string | null
          platform_fee?: number
          quote_id?: string | null
          requested_date?: string
          requested_time?: string
          service_id?: string
          service_price?: number
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          earned_at: string | null
          id: string
          status: string
          updated_at: string | null
          user_id: string
          withdrawal_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
          withdrawal_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          withdrawal_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          interests: string[] | null
          is_verified: boolean | null
          last_name: string
          parent_email: string | null
          parent_phone: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          schedule_url: string | null
          skills: string[] | null
          state: string | null
          status: Database["public"]["Enums"]["user_status"]
          stripe_connect_account_id: string | null
          updated_at: string | null
          verification_token: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          interests?: string[] | null
          is_verified?: boolean | null
          last_name: string
          parent_email?: string | null
          parent_phone?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          schedule_url?: string | null
          skills?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          stripe_connect_account_id?: string | null
          updated_at?: string | null
          verification_token?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          interests?: string[] | null
          is_verified?: boolean | null
          last_name?: string
          parent_email?: string | null
          parent_phone?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          schedule_url?: string | null
          skills?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          stripe_connect_account_id?: string | null
          updated_at?: string | null
          verification_token?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          requested_date: string | null
          requested_time: string | null
          service_id: string
          special_instructions: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          requested_date?: string | null
          requested_time?: string | null
          service_id: string
          special_instructions?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          requested_date?: string | null
          requested_time?: string | null
          service_id?: string
          special_instructions?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string | null
          estimated_duration: number | null
          id: string
          notes: string | null
          price: number
          provider_id: string
          quote_request_id: string
          status: string
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          price: number
          provider_id: string
          quote_request_id: string
          status?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          price?: number
          provider_id?: string
          quote_request_id?: string
          status?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          service_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          service_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          service_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          service_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          service_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          service_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          address: string | null
          banner_url: string | null
          category: string
          created_at: string
          delivery_method: string | null
          description: string
          duration: number
          education: string | null
          id: string
          location: string
          location_type: string | null
          price: number
          pricing_model: Database["public"]["Enums"]["pricing_model"]
          qualifications: string | null
          rating: number | null
          status: string
          title: string
          total_bookings: number
          user_id: string
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          category: string
          created_at?: string
          delivery_method?: string | null
          description: string
          duration?: number
          education?: string | null
          id?: string
          location: string
          location_type?: string | null
          price: number
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          qualifications?: string | null
          rating?: number | null
          status?: string
          title: string
          total_bookings?: number
          user_id: string
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          category?: string
          created_at?: string
          delivery_method?: string | null
          description?: string
          duration?: number
          education?: string | null
          id?: string
          location?: string
          location_type?: string | null
          price?: number
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          qualifications?: string | null
          rating?: number | null
          status?: string
          title?: string
          total_bookings?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_booking_confirmations: boolean
          email_booking_reminders: boolean
          email_marketing: boolean
          email_messages: boolean
          email_notifications_enabled: boolean
          email_quote_updates: boolean
          id: string
          profile_visibility: string
          show_email: boolean
          show_location: boolean
          show_phone: boolean
          show_ratings: boolean
          show_services: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_booking_confirmations?: boolean
          email_booking_reminders?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          email_notifications_enabled?: boolean
          email_quote_updates?: boolean
          id?: string
          profile_visibility?: string
          show_email?: boolean
          show_location?: boolean
          show_phone?: boolean
          show_ratings?: boolean
          show_services?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_booking_confirmations?: boolean
          email_booking_reminders?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          email_notifications_enabled?: boolean
          email_quote_updates?: boolean
          id?: string
          profile_visibility?: string
          show_email?: boolean
          show_location?: boolean
          show_phone?: boolean
          show_ratings?: boolean
          show_services?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          failure_reason: string | null
          id: string
          platform_fee: number
          processed_at: string | null
          status: string
          stripe_connect_account_id: string
          stripe_transfer_id: string | null
          total_earnings: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          platform_fee?: number
          processed_at?: string | null
          status?: string
          stripe_connect_account_id: string
          stripe_transfer_id?: string | null
          total_earnings: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          platform_fee?: number
          processed_at?: string | null
          status?: string
          stripe_connect_account_id?: string
          stripe_transfer_id?: string | null
          total_earnings?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      platform_analytics: {
        Row: {
          avg_booking_value: number | null
          avg_platform_fee: number | null
          avg_service_price: number | null
          total_gross_revenue: number | null
          total_paid_bookings: number | null
          total_platform_revenue: number | null
          total_service_provider_earnings: number | null
        }
        Relationships: []
      }
      user_earnings_summary: {
        Row: {
          last_earned_at: string | null
          pending_earnings: number | null
          this_month_earnings: number | null
          this_week_earnings: number | null
          total_earned: number | null
          total_earnings_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_services: {
        Row: {
          address: string | null
          banner_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          education: string | null
          id: string | null
          location: string | null
          price: number | null
          pricing_model: Database["public"]["Enums"]["pricing_model"] | null
          qualifications: string | null
          rating: number | null
          status: string | null
          title: string | null
          total_bookings: number | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          education?: string | null
          id?: string | null
          location?: string | null
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          qualifications?: string | null
          rating?: number | null
          status?: string | null
          title?: string | null
          total_bookings?: number | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          education?: string | null
          id?: string | null
          location?: string | null
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          qualifications?: string | null
          rating?: number | null
          status?: string | null
          title?: string | null
          total_bookings?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_history: {
        Row: {
          amount: number | null
          created_at: string | null
          email: string | null
          failure_reason: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          platform_fee: number | null
          processed_at: string | null
          status: string | null
          stripe_transfer_id: string | null
          total_earnings: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      create_email_verification_token: {
        Args: { user_id: string }
        Returns: string
      }
      create_password_reset_token: {
        Args: { user_email: string }
        Returns: string
      }
      generate_secure_token: { Args: { length?: number }; Returns: string }
      get_platform_revenue: { Args: never; Returns: number }
      get_user_earnings_stats: {
        Args: { p_user_id: string }
        Returns: {
          pending_earnings: number
          this_month_earned: number
          this_week_earned: number
          total_earned: number
        }[]
      }
      process_withdrawal: {
        Args: {
          p_amount: number
          p_platform_fee: number
          p_stripe_connect_account_id: string
          p_stripe_transfer_id: string
          p_total_earnings: number
          p_user_id: string
        }
        Returns: string
      }
      reset_password_with_token: {
        Args: { new_password: string; token: string }
        Returns: boolean
      }
      verify_email_with_token: { Args: { token: string }; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rejected"
        | "paid"
      pricing_model: "per_job" | "per_hour" | "quote"
      service_category:
        | "pet_care"
        | "lawn_care"
        | "tutoring"
        | "cleaning"
        | "tech_support"
        | "delivery"
        | "other"
      user_role: "teen" | "parent" | "admin"
      user_status: "active" | "inactive" | "suspended" | "pending_verification"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
        "paid",
      ],
      pricing_model: ["per_job", "per_hour", "quote"],
      service_category: [
        "pet_care",
        "lawn_care",
        "tutoring",
        "cleaning",
        "tech_support",
        "delivery",
        "other",
      ],
      user_role: ["teen", "parent", "admin"],
      user_status: ["active", "inactive", "suspended", "pending_verification"],
    },
  },
} as const;
