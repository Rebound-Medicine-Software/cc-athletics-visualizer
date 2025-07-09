export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          age: number | null
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
      teams: {
        Row: {
          cc_team_id: string
          city: string | null
          country: string | null
          created_at: string | null
          creation_date: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          region: string | null
          updated_at: string | null
        }
        Insert: {
          cc_team_id: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          cc_team_id?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          region?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
