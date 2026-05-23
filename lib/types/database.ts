export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability_exceptions: {
        Row: {
          created_at: string
          end_time: string | null
          exception_date: string
          id: string
          is_blocked: boolean
          provider_id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          exception_date: string
          id?: string
          is_blocked?: boolean
          provider_id: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          exception_date?: string
          id?: string
          is_blocked?: boolean
          provider_id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          provider_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          provider_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          provider_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address_city: string
          address_lat: number | null
          address_line: string | null
          address_lng: number | null
          address_notes: string | null
          appointment_type: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          duration_minutes: number
          end_at: string
          id: string
          platform_fee_cents: number
          provider_display_name_snapshot: string
          provider_earnings_cents: number | null
          provider_id: string
          provider_service_id: string
          provider_slug_snapshot: string
          scheduled_at: string
          service_name_en_snapshot: string
          service_name_nl_snapshot: string
          service_price_cents_snapshot: number
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          address_city?: string
          address_lat?: number | null
          address_line?: string | null
          address_lng?: number | null
          address_notes?: string | null
          appointment_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          duration_minutes: number
          end_at?: string  // set automatically by bookings_set_end_at trigger
          id?: string
          platform_fee_cents?: number
          provider_display_name_snapshot: string
          provider_earnings_cents?: number | null
          provider_id: string
          provider_service_id: string
          provider_slug_snapshot: string
          scheduled_at: string
          service_name_en_snapshot: string
          service_name_nl_snapshot: string
          service_price_cents_snapshot: number
          status?: string
          total_cents: number
          updated_at?: string
        }
        Update: {
          address_city?: string
          address_lat?: number | null
          address_line?: string | null
          address_lng?: number | null
          address_notes?: string | null
          appointment_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          duration_minutes?: number
          end_at?: string
          id?: string
          platform_fee_cents?: number
          provider_display_name_snapshot?: string
          provider_earnings_cents?: number | null
          provider_id?: string
          provider_service_id?: string
          provider_slug_snapshot?: string
          scheduled_at?: string
          service_name_en_snapshot?: string
          service_name_nl_snapshot?: string
          service_price_cents_snapshot?: number
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_service_id_fkey"
            columns: ["provider_service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          id: string
          platform_fee_cents: number
          provider_amount_cents: number
          refund_amount_cents: number
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string
          stripe_refund_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          id?: string
          platform_fee_cents?: number
          provider_amount_cents?: number
          refund_amount_cents?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id: string
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          id?: string
          platform_fee_cents?: number
          provider_amount_cents?: number
          refund_amount_cents?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          is_admin: boolean
          is_customer: boolean
          is_provider: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id: string
          is_admin?: boolean
          is_customer?: boolean
          is_provider?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          is_admin?: boolean
          is_customer?: boolean
          is_provider?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_services: {
        Row: {
          created_at: string
          custom_price_cents: number | null
          id: string
          is_active: boolean
          provider_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_price_cents?: number | null
          id?: string
          is_active?: boolean
          provider_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_price_cents?: number | null
          id?: string
          is_active?: boolean
          provider_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          avg_rating: number | null
          bio: string | null
          certifications: Json
          city: string
          created_at: string
          id: string
          is_active: boolean
          is_verified: boolean
          mobile_notes: string | null
          mobile_radius_km: number | null
          mobile_travel_fee_cents: number | null
          profile_id: string
          service_area_km: number
          service_mode: string
          slug: string
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean
          studio_address: string | null
          studio_city: string | null
          studio_notes: string | null
          studio_postcode: string | null
          total_reviews: number
          updated_at: string
        }
        Insert: {
          avg_rating?: number | null
          bio?: string | null
          certifications?: Json
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          mobile_notes?: string | null
          mobile_radius_km?: number | null
          mobile_travel_fee_cents?: number | null
          profile_id: string
          service_area_km?: number
          service_mode?: string
          slug: string
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean
          studio_address?: string | null
          studio_city?: string | null
          studio_notes?: string | null
          studio_postcode?: string | null
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          avg_rating?: number | null
          bio?: string | null
          certifications?: Json
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          mobile_notes?: string | null
          mobile_radius_km?: number | null
          mobile_travel_fee_cents?: number | null
          profile_id?: string
          service_area_km?: number
          service_mode?: string
          slug?: string
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean
          studio_address?: string | null
          studio_city?: string | null
          studio_notes?: string | null
          studio_postcode?: string | null
          total_reviews?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          is_published: boolean
          provider_id: string
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_published?: boolean
          provider_id: string
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_published?: boolean
          provider_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_nl: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_nl: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_nl?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price_cents: number
          category_id: string
          created_at: string
          description_en: string | null
          description_nl: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name_en: string
          name_nl: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_price_cents: number
          category_id: string
          created_at?: string
          description_en?: string | null
          description_nl?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name_en: string
          name_nl: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_price_cents?: number
          category_id?: string
          created_at?: string
          description_en?: string | null
          description_nl?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name_en?: string
          name_nl?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_provider_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
