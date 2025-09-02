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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          age: number | null
          avatar_url: string | null
          cc_athlete_id: string
          cc_team_id: string | null
          created_at: string | null
          gender: string | null
          height_cm: number | null
          id: string
          name: string
          team_id: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          cc_athlete_id: string
          cc_team_id?: string | null
          created_at?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          name: string
          team_id?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          cc_athlete_id?: string
          cc_team_id?: string | null
          created_at?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_date: string
          client_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          team_id: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          team_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          team_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_therapist_id: string | null
          created_at: string | null
          id: string
          status: string | null
          stripe_status: string | null
          team_id: string | null
          tier_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_therapist_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_status?: string | null
          team_id?: string | null
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_therapist_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_status?: string | null
          team_id?: string | null
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      "Elite Athlete Data": {
        Row: {
          "Age Group": number
          "Athlete Name": string
          "CMJ Jump Height (cm)": number | null
          "CMJ Peak Power (W)": number | null
          "CMJ Reactive Strength Index": string | null
          "CMJ Relative Peak Power (W/kg)": number | null
          created_at: string
          id: string
          "IMTP Peak Force (N)": number | null
          "IMTP Relative Peak Force (N/kg)": number | null
          Sex: string
          Sport: string
          "Team Name": string
          "Weight Category (kg)": string
        }
        Insert: {
          "Age Group": number
          "Athlete Name": string
          "CMJ Jump Height (cm)"?: number | null
          "CMJ Peak Power (W)"?: number | null
          "CMJ Reactive Strength Index"?: string | null
          "CMJ Relative Peak Power (W/kg)"?: number | null
          created_at?: string
          id?: string
          "IMTP Peak Force (N)"?: number | null
          "IMTP Relative Peak Force (N/kg)"?: number | null
          Sex: string
          Sport: string
          "Team Name": string
          "Weight Category (kg)": string
        }
        Update: {
          "Age Group"?: number
          "Athlete Name"?: string
          "CMJ Jump Height (cm)"?: number | null
          "CMJ Peak Power (W)"?: number | null
          "CMJ Reactive Strength Index"?: string | null
          "CMJ Relative Peak Power (W/kg)"?: number | null
          created_at?: string
          id?: string
          "IMTP Peak Force (N)"?: number | null
          "IMTP Relative Peak Force (N/kg)"?: number | null
          Sex?: string
          Sport?: string
          "Team Name"?: string
          "Weight Category (kg)"?: string
        }
        Relationships: []
      }
      "Elite Athletes New": {
        Row: {
          "Age Group": number | null
          "Athlete Name": string | null
          "CMJ Jump Height (cm)": number | null
          "CMJ Peak Power (W)": number | null
          "CMJ Reactive Strength Index": string | null
          "CMJ Relative Peak Power (W/kg)": number | null
          "IMTP Peak Force (N)": number | null
          "IMTP Relative Peak Force (N/kg)": number | null
          Sex: string | null
          Sport: string | null
          "Team Name": string
          "Weight Category (kg)": string | null
        }
        Insert: {
          "Age Group"?: number | null
          "Athlete Name"?: string | null
          "CMJ Jump Height (cm)"?: number | null
          "CMJ Peak Power (W)"?: number | null
          "CMJ Reactive Strength Index"?: string | null
          "CMJ Relative Peak Power (W/kg)"?: number | null
          "IMTP Peak Force (N)"?: number | null
          "IMTP Relative Peak Force (N/kg)"?: number | null
          Sex?: string | null
          Sport?: string | null
          "Team Name": string
          "Weight Category (kg)"?: string | null
        }
        Update: {
          "Age Group"?: number | null
          "Athlete Name"?: string | null
          "CMJ Jump Height (cm)"?: number | null
          "CMJ Peak Power (W)"?: number | null
          "CMJ Reactive Strength Index"?: string | null
          "CMJ Relative Peak Power (W/kg)"?: number | null
          "IMTP Peak Force (N)"?: number | null
          "IMTP Relative Peak Force (N/kg)"?: number | null
          Sex?: string | null
          Sport?: string | null
          "Team Name"?: string
          "Weight Category (kg)"?: string | null
        }
        Relationships: []
      }
      elite_athlete_metrics: {
        Row: {
          age_group: string | null
          athlete_name: string
          created_at: string | null
          exercise: string
          id: string
          metric_type: string
          metric_value: number
          sex: string | null
          sport: string | null
          team_name: string
          test_date: string | null
          weight_category_kg: number | null
        }
        Insert: {
          age_group?: string | null
          athlete_name: string
          created_at?: string | null
          exercise: string
          id?: string
          metric_type: string
          metric_value: number
          sex?: string | null
          sport?: string | null
          team_name: string
          test_date?: string | null
          weight_category_kg?: number | null
        }
        Update: {
          age_group?: string | null
          athlete_name?: string
          created_at?: string | null
          exercise?: string
          id?: string
          metric_type?: string
          metric_value?: number
          sex?: string | null
          sport?: string | null
          team_name?: string
          test_date?: string | null
          weight_category_kg?: number | null
        }
        Relationships: []
      }
      exercise_videos: {
        Row: {
          created_at: string
          id: string
          Procedure: string | null
          Purpose: string | null
          test_name: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          Procedure?: string | null
          Purpose?: string | null
          test_name: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          Procedure?: string | null
          Purpose?: string | null
          test_name?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          from_user_id: string | null
          id: string
          message_body: string
          status: string | null
          subject: string | null
          team_id: string | null
          to_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          message_body: string
          status?: string | null
          subject?: string | null
          team_id?: string | null
          to_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          message_body?: string
          status?: string | null
          subject?: string | null
          team_id?: string | null
          to_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_date: string | null
          metric_name: string
          metric_value: number
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_date?: string | null
          metric_name: string
          metric_value: number
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_date?: string | null
          metric_name?: string
          metric_value?: number
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          qualifications: string | null
          role: string | null
          role_title: string | null
          setup_completed: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          team_id: string | null
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          qualifications?: string | null
          role?: string | null
          role_title?: string | null
          setup_completed?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          team_id?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          qualifications?: string | null
          role?: string | null
          role_title?: string | null
          setup_completed?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          team_id?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      "Region Testing": {
        Row: {
          address: string | null
          country: string
          id: string | null
          logo: string | null
          region: string | null
          "Team Name": string
        }
        Insert: {
          address?: string | null
          country: string
          id?: string | null
          logo?: string | null
          region?: string | null
          "Team Name": string
        }
        Update: {
          address?: string | null
          country?: string
          id?: string | null
          logo?: string | null
          region?: string | null
          "Team Name"?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          accent_color: string | null
          admin_id: string | null
          api_key: string | null
          cc_team_id: string
          city: string | null
          country: string | null
          created_at: string | null
          creation_date: string | null
          font_family: string | null
          id: string
          latitude: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          practitioner_count: number | null
          primary_color: string | null
          region: string | null
          secondary_color: string | null
          setup_data: Json | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          admin_id?: string | null
          api_key?: string | null
          cc_team_id: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          font_family?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
          setup_data?: Json | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          admin_id?: string | null
          api_key?: string | null
          cc_team_id?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          font_family?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
          setup_data?: Json | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_data: {
        Row: {
          athlete_id: string | null
          athlete_name: string
          cc_athlete_id: string
          created_at: string | null
          id: string
          metrics: Json
          repetition_number: number
          team_name: string
          test_city: string | null
          test_date: string
          test_location: string | null
          test_name: string
          test_region: string | null
          test_type: string
          updated_at: string | null
        }
        Insert: {
          athlete_id?: string | null
          athlete_name: string
          cc_athlete_id: string
          created_at?: string | null
          id?: string
          metrics: Json
          repetition_number: number
          team_name: string
          test_city?: string | null
          test_date: string
          test_location?: string | null
          test_name: string
          test_region?: string | null
          test_type: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string | null
          athlete_name?: string
          cc_athlete_id?: string
          created_at?: string | null
          id?: string
          metrics?: Json
          repetition_number?: number
          team_name?: string
          test_city?: string | null
          test_date?: string
          test_location?: string | null
          test_name?: string
          test_region?: string | null
          test_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_data_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      test_videos: {
        Row: {
          created_at: string | null
          id: string
          test_link: string
          test_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          test_link: string
          test_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          test_link?: string
          test_name?: string
        }
        Relationships: []
      }
      tiers: {
        Row: {
          can_adjust_sets_reps: boolean | null
          can_edit_programming: boolean | null
          can_export_reports: boolean | null
          can_view_analytics: boolean | null
          created_at: string
          id: string
          max_bookings_per_month: number | null
          name: string
          price_monthly: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          can_adjust_sets_reps?: boolean | null
          can_edit_programming?: boolean | null
          can_export_reports?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          id?: string
          max_bookings_per_month?: number | null
          name: string
          price_monthly: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          can_adjust_sets_reps?: boolean | null
          can_edit_programming?: boolean | null
          can_export_reports?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          id?: string
          max_bookings_per_month?: number | null
          name?: string
          price_monthly?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          team_id: string | null
          tier_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          team_id?: string | null
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          team_id?: string | null
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "super_admin" | "practitioner" | "client" | "organisation"
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
      user_role: ["super_admin", "practitioner", "client", "organisation"],
    },
  },
} as const
