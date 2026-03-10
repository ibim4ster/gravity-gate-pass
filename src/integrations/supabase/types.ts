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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contact_requests: {
        Row: {
          bar_name: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          bar_name?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          bar_name?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      event_assignments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          category: string
          city: string
          created_at: string
          date: string
          description: string | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          lineup: string | null
          maps_url: string | null
          min_age: number | null
          offer_active: boolean
          offer_text: string | null
          organizer_id: string | null
          status: string
          time: string
          title: string
          updated_at: string
          venue: string
          video_url: string | null
        }
        Insert: {
          capacity?: number
          category?: string
          city: string
          created_at?: string
          date: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          lineup?: string | null
          maps_url?: string | null
          min_age?: number | null
          offer_active?: boolean
          offer_text?: string | null
          organizer_id?: string | null
          status?: string
          time: string
          title: string
          updated_at?: string
          venue: string
          video_url?: string | null
        }
        Update: {
          capacity?: number
          category?: string
          city?: string
          created_at?: string
          date?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          lineup?: string | null
          maps_url?: string | null
          min_age?: number | null
          offer_active?: boolean
          offer_text?: string | null
          organizer_id?: string | null
          status?: string
          time?: string
          title?: string
          updated_at?: string
          venue?: string
          video_url?: string | null
        }
        Relationships: []
      }
      price_tiers: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          expires_at: string | null
          id: string
          image_urls: string[] | null
          max_quantity: number
          name: string
          price: number
          sold: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          image_urls?: string[] | null
          max_quantity: number
          name: string
          price: number
          sold?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          image_urls?: string[] | null
          max_quantity?: number
          name?: string
          price?: number
          sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_logs: {
        Row: {
          attendee_name: string | null
          event_id: string
          id: string
          result: string
          scanned_at: string
          staff_id: string
          ticket_id: string
        }
        Insert: {
          attendee_name?: string | null
          event_id: string
          id?: string
          result: string
          scanned_at?: string
          staff_id: string
          ticket_id: string
        }
        Update: {
          attendee_name?: string | null
          event_id?: string
          id?: string
          result?: string
          scanned_at?: string
          staff_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          buyer_dni: string | null
          buyer_dob: string | null
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          buyer_user_id: string | null
          event_id: string
          id: string
          price: number
          price_tier_id: string | null
          purchased_at: string
          qr_code: string
          qr_signature: string
          quantity: number
          scanned_by: string | null
          status: string
          tier_name: string
          used_at: string | null
        }
        Insert: {
          buyer_dni?: string | null
          buyer_dob?: string | null
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          buyer_user_id?: string | null
          event_id: string
          id?: string
          price: number
          price_tier_id?: string | null
          purchased_at?: string
          qr_code?: string
          qr_signature?: string
          quantity?: number
          scanned_by?: string | null
          status?: string
          tier_name: string
          used_at?: string | null
        }
        Update: {
          buyer_dni?: string | null
          buyer_dob?: string | null
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          buyer_user_id?: string | null
          event_id?: string
          id?: string
          price?: number
          price_tier_id?: string | null
          purchased_at?: string
          qr_code?: string
          qr_signature?: string
          quantity?: number
          scanned_by?: string | null
          status?: string
          tier_name?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_price_tier_id_fkey"
            columns: ["price_tier_id"]
            isOneToOne: false
            referencedRelation: "price_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_ticket_by_id: {
        Args: { _ticket_id: string }
        Returns: {
          buyer_dni: string
          buyer_dob: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          buyer_user_id: string
          event_id: string
          id: string
          price: number
          price_tier_id: string
          purchased_at: string
          qr_code: string
          qr_signature: string
          quantity: number
          scanned_by: string
          status: string
          tier_name: string
          used_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_and_redeem_ticket: {
        Args: {
          _allowed_event_ids?: string[]
          _qr_code: string
          _qr_signature: string
          _staff_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "client"
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
      app_role: ["admin", "staff", "client"],
    },
  },
} as const
