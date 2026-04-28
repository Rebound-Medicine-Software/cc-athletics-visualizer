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
          activity_status: string | null
          age: number | null
          avatar_url: string | null
          cc_athlete_id: string
          cc_team_id: string | null
          consent_ip_address: string | null
          consent_signed_at: string | null
          consent_signed_name: string | null
          consent_status: string
          consent_token: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          height_cm: number | null
          id: string
          last_test_at: string | null
          name: string
          password_hash: string | null
          reports_sent_count: number | null
          team_id: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_status?: string | null
          age?: number | null
          avatar_url?: string | null
          cc_athlete_id: string
          cc_team_id?: string | null
          consent_ip_address?: string | null
          consent_signed_at?: string | null
          consent_signed_name?: string | null
          consent_status?: string
          consent_token?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          last_test_at?: string | null
          name: string
          password_hash?: string | null
          reports_sent_count?: number | null
          team_id?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_status?: string | null
          age?: number | null
          avatar_url?: string | null
          cc_athlete_id?: string
          cc_team_id?: string | null
          consent_ip_address?: string | null
          consent_signed_at?: string | null
          consent_signed_name?: string | null
          consent_status?: string
          consent_token?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          last_test_at?: string | null
          name?: string
          password_hash?: string | null
          reports_sent_count?: number | null
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
          {
            foreignKeyName: "athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_data_warehouse: {
        Row: {
          age_group: string | null
          country: string | null
          created_at: string | null
          id: string
          is_elite: boolean | null
          metric_name: string | null
          metric_value: number | null
          region: string | null
          source_test_id: string | null
          sport: string | null
          team_id: string | null
          test_type: string | null
          weight_category: string | null
        }
        Insert: {
          age_group?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_elite?: boolean | null
          metric_name?: string | null
          metric_value?: number | null
          region?: string | null
          source_test_id?: string | null
          sport?: string | null
          team_id?: string | null
          test_type?: string | null
          weight_category?: string | null
        }
        Update: {
          age_group?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_elite?: boolean | null
          metric_name?: string | null
          metric_value?: number | null
          region?: string | null
          source_test_id?: string | null
          sport?: string | null
          team_id?: string | null
          test_type?: string | null
          weight_category?: string | null
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          monthly_value: number | null
          payment_status: string | null
          renewal_date: string | null
          seat_count: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_id: string
          tier_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          monthly_value?: number | null
          payment_status?: string | null
          renewal_date?: string | null
          seat_count?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id: string
          tier_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          monthly_value?: number | null
          payment_status?: string | null
          renewal_date?: string | null
          seat_count?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string
          tier_name?: string | null
        }
        Relationships: []
      }
      booking_notes: {
        Row: {
          cal_uid: string
          created_at: string
          id: string
          last_edited_by: string | null
          last_edited_by_name: string | null
          notes: string
          team_id: string
          updated_at: string
        }
        Insert: {
          cal_uid: string
          created_at?: string
          id?: string
          last_edited_by?: string | null
          last_edited_by_name?: string | null
          notes?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          cal_uid?: string
          created_at?: string
          id?: string
          last_edited_by?: string | null
          last_edited_by_name?: string | null
          notes?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_date: string
          booking_source: string | null
          client_id: string | null
          created_at: string | null
          failure_reason: string | null
          id: string
          notes: string | null
          status: string | null
          sync_status: string | null
          team_id: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          booking_source?: string | null
          client_id?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          sync_status?: string | null
          team_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          booking_source?: string | null
          client_id?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          sync_status?: string | null
          team_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      elite_athlete_data: {
        Row: {
          age_group: number | null
          athlete_name: string
          cmj_jump_height_cm: number | null
          cmj_peak_power_w: number | null
          cmj_reactive_strength_index: string | null
          cmj_relative_peak_power_w_per_kg: number | null
          created_at: string
          dynamic_metrics: Json | null
          id: string
          imtp_peak_force_n: number | null
          imtp_relative_peak_force_n_per_kg: number | null
          sex: string | null
          sport: string | null
          team_name: string
          test_date: string | null
          updated_at: string
          weight_category: string | null
        }
        Insert: {
          age_group?: number | null
          athlete_name: string
          cmj_jump_height_cm?: number | null
          cmj_peak_power_w?: number | null
          cmj_reactive_strength_index?: string | null
          cmj_relative_peak_power_w_per_kg?: number | null
          created_at?: string
          dynamic_metrics?: Json | null
          id?: string
          imtp_peak_force_n?: number | null
          imtp_relative_peak_force_n_per_kg?: number | null
          sex?: string | null
          sport?: string | null
          team_name: string
          test_date?: string | null
          updated_at?: string
          weight_category?: string | null
        }
        Update: {
          age_group?: number | null
          athlete_name?: string
          cmj_jump_height_cm?: number | null
          cmj_peak_power_w?: number | null
          cmj_reactive_strength_index?: string | null
          cmj_relative_peak_power_w_per_kg?: number | null
          created_at?: string
          dynamic_metrics?: Json | null
          id?: string
          imtp_peak_force_n?: number | null
          imtp_relative_peak_force_n_per_kg?: number | null
          sex?: string | null
          sport?: string | null
          team_name?: string
          test_date?: string | null
          updated_at?: string
          weight_category?: string | null
        }
        Relationships: []
      }
      elite_exercise_configs: {
        Row: {
          created_at: string
          id: string
          metrics: string[]
          test_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: string[]
          test_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: string[]
          test_name?: string
          updated_at?: string
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
      integration_health_logs: {
        Row: {
          failure_reason: string | null
          id: string
          integration_name: string
          latency_ms: number | null
          logged_at: string | null
          payload: Json | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          failure_reason?: string | null
          id?: string
          integration_name: string
          latency_ms?: number | null
          logged_at?: string | null
          payload?: Json | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          failure_reason?: string | null
          id?: string
          integration_name?: string
          latency_ms?: number | null
          logged_at?: string | null
          payload?: Json | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          role: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          team_id?: string | null
          user_id?: string
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
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_health_metrics: {
        Row: {
          ai_requests: number | null
          api_failure_count: number | null
          athlete_count: number | null
          bookings_count: number | null
          churn_risk_score: number | null
          consent_completion_rate: number | null
          engagement_score: number | null
          id: string
          login_count: number | null
          practitioner_count: number | null
          reports_generated: number | null
          revenue: number | null
          snapshot_date: string
          team_id: string
          tests_logged: number | null
        }
        Insert: {
          ai_requests?: number | null
          api_failure_count?: number | null
          athlete_count?: number | null
          bookings_count?: number | null
          churn_risk_score?: number | null
          consent_completion_rate?: number | null
          engagement_score?: number | null
          id?: string
          login_count?: number | null
          practitioner_count?: number | null
          reports_generated?: number | null
          revenue?: number | null
          snapshot_date: string
          team_id: string
          tests_logged?: number | null
        }
        Update: {
          ai_requests?: number | null
          api_failure_count?: number | null
          athlete_count?: number | null
          bookings_count?: number | null
          churn_risk_score?: number | null
          consent_completion_rate?: number | null
          engagement_score?: number | null
          id?: string
          login_count?: number | null
          practitioner_count?: number | null
          reports_generated?: number | null
          revenue?: number | null
          snapshot_date?: string
          team_id?: string
          tests_logged?: number | null
        }
        Relationships: []
      }
      platform_activity_logs: {
        Row: {
          athlete_id: string | null
          created_at: string | null
          event_source: string | null
          event_type: string
          id: string
          metadata: Json | null
          organisation_name: string | null
          severity: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string | null
          event_source?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          organisation_name?: string | null
          severity?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string | null
          event_source?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organisation_name?: string | null
          severity?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      platform_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          is_resolved: boolean | null
          related_record_id: string | null
          resolved_by: string | null
          severity: string
          team_id: string | null
          title: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          related_record_id?: string | null
          resolved_by?: string | null
          severity: string
          team_id?: string | null
          title?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          related_record_id?: string | null
          resolved_by?: string | null
          severity?: string
          team_id?: string | null
          title?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "platform_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
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
          password_hash: string | null
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
          password_hash?: string | null
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
          password_hash?: string | null
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
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
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
      social_engagement_snapshots: {
        Row: {
          engagement: number | null
          fetched_at: string
          followers: number | null
          id: string
          impressions: number | null
          platform: string
          reach: number | null
          recent_posts: Json | null
          team_id: string | null
        }
        Insert: {
          engagement?: number | null
          fetched_at?: string
          followers?: number | null
          id?: string
          impressions?: number | null
          platform: string
          reach?: number | null
          recent_posts?: Json | null
          team_id?: string | null
        }
        Update: {
          engagement?: number | null
          fetched_at?: string
          followers?: number | null
          id?: string
          impressions?: number | null
          platform?: string
          reach?: number | null
          recent_posts?: Json | null
          team_id?: string | null
        }
        Relationships: []
      }
      super_admin_impersonation_logs: {
        Row: {
          ended_at: string | null
          id: string
          impersonated_user_id: string | null
          reason: string | null
          started_at: string | null
          super_admin_id: string
          team_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          reason?: string | null
          started_at?: string | null
          super_admin_id: string
          team_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          reason?: string | null
          started_at?: string | null
          super_admin_id?: string
          team_id?: string
        }
        Relationships: []
      }
      super_admin_users: {
        Row: {
          auth_user_id: string
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          permissions: Json | null
          role: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          conversation: Json | null
          created_at: string | null
          id: string
          opened_by: string | null
          priority: string | null
          status: string | null
          subject: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          conversation?: Json | null
          created_at?: string | null
          id?: string
          opened_by?: string | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          conversation?: Json | null
          created_at?: string | null
          id?: string
          opened_by?: string | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          accent_color: string | null
          admin_id: string | null
          api_key: string | null
          calcom_connected: boolean | null
          cc_athletics_connected: boolean | null
          cc_team_id: string
          churn_risk_score: number | null
          city: string | null
          country: string | null
          created_at: string | null
          creation_date: string | null
          font_family: string | null
          id: string
          last_activity_at: string | null
          latitude: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          notificationapi_connected: boolean | null
          organisation_status: string | null
          owner_user_id: string | null
          practitioner_count: number | null
          primary_color: string | null
          region: string | null
          secondary_color: string | null
          setup_data: Json | null
          stripe_account_id: string | null
          subscription_status: string | null
          tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          admin_id?: string | null
          api_key?: string | null
          calcom_connected?: boolean | null
          cc_athletics_connected?: boolean | null
          cc_team_id: string
          churn_risk_score?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          font_family?: string | null
          id?: string
          last_activity_at?: string | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          notificationapi_connected?: boolean | null
          organisation_status?: string | null
          owner_user_id?: string | null
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
          setup_data?: Json | null
          stripe_account_id?: string | null
          subscription_status?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          admin_id?: string | null
          api_key?: string | null
          calcom_connected?: boolean | null
          cc_athletics_connected?: boolean | null
          cc_team_id?: string
          churn_risk_score?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          font_family?: string | null
          id?: string
          last_activity_at?: string | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          notificationapi_connected?: boolean | null
          organisation_status?: string | null
          owner_user_id?: string | null
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
          setup_data?: Json | null
          stripe_account_id?: string | null
          subscription_status?: string | null
          tier_id?: string | null
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
          {
            foreignKeyName: "tiers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      teams_public: {
        Row: {
          accent_color: string | null
          city: string | null
          country: string | null
          creation_date: string | null
          font_family: string | null
          id: string | null
          latitude: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          name: string | null
          practitioner_count: number | null
          primary_color: string | null
          region: string | null
          secondary_color: string | null
        }
        Insert: {
          accent_color?: string | null
          city?: string | null
          country?: string | null
          creation_date?: string | null
          font_family?: string | null
          id?: string | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
        }
        Update: {
          accent_color?: string | null
          city?: string | null
          country?: string | null
          creation_date?: string | null
          font_family?: string | null
          id?: string | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_team_row: { Args: { row_team_id: string }; Returns: boolean }
      get_churn_risk_trend: {
        Args: { days_back?: number }
        Returns: {
          avg_churn_risk: number
          day: string
          high_risk_org_count: number
        }[]
      }
      get_global_activity_feed: {
        Args: { limit_count?: number }
        Returns: {
          athlete_id: string | null
          created_at: string | null
          event_source: string | null
          event_type: string
          id: string
          metadata: Json | null
          organisation_name: string | null
          severity: string | null
          team_id: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_activity_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_integration_detail: {
        Args: { integration_name_in: string }
        Returns: Json
      }
      get_integration_overview: {
        Args: never
        Returns: {
          affected_team_count: number
          avg_latency_ms_24h: number
          failure_count_24h: number
          integration_name: string
          last_failure_at: string
          last_success_at: string
          status: string
          success_count_24h: number
          team_connected_count: number
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_team_id: { Args: never; Returns: string }
      get_organisation_detail: { Args: { team_uuid: string }; Returns: Json }
      get_organisation_health: {
        Args: never
        Returns: {
          athlete_count: number
          churn_risk: number
          last_activity: string
          monthly_revenue: number
          organisation_name: string
          organisation_status: string
          practitioner_count: number
          subscription_status: string
          team_id: string
          tests_logged: number
        }[]
      }
      get_organisations_kpis: { Args: never; Returns: Json }
      get_platform_alerts: {
        Args: never
        Returns: {
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          is_resolved: boolean | null
          related_record_id: string | null
          resolved_by: string | null
          severity: string
          team_id: string | null
          title: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_alerts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_platform_kpis: { Args: never; Returns: Json }
      get_practitioner_engagement_trend: {
        Args: { days_back?: number }
        Returns: {
          active_practitioner_count: number
          avg_engagement_score: number
          day: string
        }[]
      }
      get_revenue_trend: {
        Args: { days_back?: number }
        Returns: {
          active_subscriptions: number
          day: string
          total_revenue: number
        }[]
      }
      get_support_ticket_detail: {
        Args: { ticket_uuid: string }
        Returns: Json
      }
      get_tests_logged_trend: {
        Args: { days_back?: number }
        Returns: {
          day: string
          tests_logged_count: number
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_super_admin_owner: { Args: { _user_id: string }; Returns: boolean }
      list_organisations_overview: {
        Args: never
        Returns: {
          athlete_count: number
          calcom_status: string
          cc_athletics_status: string
          cc_team_id: string
          churn_risk_score: number
          country: string
          created_at: string
          id: string
          last_activity_at: string
          monthly_revenue: number
          name: string
          notificationapi_status: string
          organisation_status: string
          owner_email: string
          owner_full_name: string
          practitioner_count: number
          primary_color: string
          subscription_status: string
          tests_this_month: number
          tier_name: string
        }[]
      }
      list_support_tickets: {
        Args: never
        Returns: {
          assigned_to: string
          assigned_to_name: string
          conversation_count: number
          created_at: string
          id: string
          last_message_preview: string
          opened_by: string
          opened_by_name: string
          organisation_name: string
          priority: string
          status: string
          subject: string
          team_id: string
          updated_at: string
        }[]
      }
      update_support_ticket: {
        Args: {
          append_entry_body?: string
          append_entry_kind?: string
          clear_assigned?: boolean
          new_assigned_to?: string
          new_priority?: string
          new_status?: string
          ticket_uuid: string
        }
        Returns: Json
      }
    }
    Enums: {
      test_name_enum: "cmj" | "squat_jump" | "drop_jump" | "pogo_jump"
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
      test_name_enum: ["cmj", "squat_jump", "drop_jump", "pogo_jump"],
      user_role: ["super_admin", "practitioner", "client", "organisation"],
    },
  },
} as const
