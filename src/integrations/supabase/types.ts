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
      ai_coach_insights: {
        Row: {
          athlete_id: string | null
          created_at: string
          created_by: string | null
          id: string
          insight: Json
          source_metrics_hash: string
          team_id: string
          test_date: string | null
          test_name: string
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insight: Json
          source_metrics_hash: string
          team_id: string
          test_date?: string | null
          test_name: string
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insight?: Json
          source_metrics_hash?: string
          team_id?: string
          test_date?: string | null
          test_name?: string
        }
        Relationships: []
      }
      athlete_program_assignments: {
        Row: {
          assigned_by: string | null
          athlete_id: string
          created_at: string
          end_date: string | null
          id: string
          override_payload: Json
          start_date: string
          status: string
          team_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          athlete_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          override_payload?: Json
          start_date?: string
          status?: string
          team_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          athlete_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          override_payload?: Json
          start_date?: string
          status?: string
          team_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_program_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "programming_templates"
            referencedColumns: ["id"]
          },
        ]
      }
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
          sport_primary: string | null
          sports: string[]
          team_id: string | null
          updated_at: string | null
          user_id: string | null
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
          sport_primary?: string | null
          sports?: string[]
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          sport_primary?: string | null
          sports?: string[]
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      exercises: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          equipment: string[]
          id: string
          instructions: string | null
          is_archived: boolean
          name: string
          primary_muscles: string[]
          team_id: string
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          equipment?: string[]
          id?: string
          instructions?: string | null
          is_archived?: boolean
          name: string
          primary_muscles?: string[]
          team_id: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          equipment?: string[]
          id?: string
          instructions?: string | null
          is_archived?: boolean
          name?: string
          primary_muscles?: string[]
          team_id?: string
          updated_at?: string
          updated_by?: string | null
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
      platform_in_app_notifications: {
        Row: {
          campaign_id: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          message: string
          metadata: Json
          read_at: string | null
          recipient_user_id: string
          severity: string
          team_id: string | null
          title: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          recipient_user_id: string
          severity?: string
          team_id?: string | null
          title: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          recipient_user_id?: string
          severity?: string
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_in_app_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "platform_notification_campaigns"
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
          {
            foreignKeyName: "platform_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_notification_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          delivered_count: number
          delivery_channel: string
          error_summary: string | null
          failed_count: number
          id: string
          message: string
          metadata: Json
          queued_at: string | null
          recipient_count: number
          sent_at: string | null
          status: string
          target_type: string
          target_value: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          delivery_channel?: string
          error_summary?: string | null
          failed_count?: number
          id?: string
          message: string
          metadata?: Json
          queued_at?: string | null
          recipient_count?: number
          sent_at?: string | null
          status?: string
          target_type?: string
          target_value?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          delivery_channel?: string
          error_summary?: string | null
          failed_count?: number
          id?: string
          message?: string
          metadata?: Json
          queued_at?: string | null
          recipient_count?: number
          sent_at?: string | null
          status?: string
          target_type?: string
          target_value?: string | null
          title?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_tier_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_bookings_per_month: number
          monthly_price: number
          name: string
          permissions: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_bookings_per_month?: number
          monthly_price?: number
          name: string
          permissions?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_bookings_per_month?: number
          monthly_price?: number
          name?: string
          permissions?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_webhook_endpoints: {
        Row: {
          created_at: string
          created_by: string | null
          failure_reason: string | null
          id: string
          is_active: boolean
          label: string
          last_failure_at: string | null
          last_success_at: string | null
          secret: string | null
          team_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          failure_reason?: string | null
          id?: string
          is_active?: boolean
          label: string
          last_failure_at?: string | null
          last_success_at?: string | null
          secret?: string | null
          team_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          failure_reason?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          secret?: string | null
          team_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
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
      programme_completion_logs: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          load_used: string | null
          logged_by: string | null
          notes: string | null
          performed_on: string
          programming_exercise_id: string | null
          programming_session_id: string | null
          reps_completed: string | null
          rpe: number | null
          sets_completed: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          load_used?: string | null
          logged_by?: string | null
          notes?: string | null
          performed_on?: string
          programming_exercise_id?: string | null
          programming_session_id?: string | null
          reps_completed?: string | null
          rpe?: number | null
          sets_completed?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          load_used?: string | null
          logged_by?: string | null
          notes?: string | null
          performed_on?: string
          programming_exercise_id?: string | null
          programming_session_id?: string | null
          reps_completed?: string | null
          rpe?: number | null
          sets_completed?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_completion_logs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "athlete_program_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_completion_logs_programming_exercise_id_fkey"
            columns: ["programming_exercise_id"]
            isOneToOne: false
            referencedRelation: "programming_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_completion_logs_programming_session_id_fkey"
            columns: ["programming_session_id"]
            isOneToOne: false
            referencedRelation: "programming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      programming_blocks: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          position: number
          template_id: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          position?: number
          template_id: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          position?: number
          template_id?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programming_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "programming_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      programming_exercises: {
        Row: {
          block_id: string
          created_at: string
          exercise_id: string | null
          id: string
          load: string | null
          notes: string | null
          position: number
          reps: string | null
          rest_seconds: number | null
          rpe: number | null
          session_id: string | null
          sets: number | null
          tempo: string | null
          updated_at: string
        }
        Insert: {
          block_id: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          load?: string | null
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id?: string | null
          sets?: number | null
          tempo?: string | null
          updated_at?: string
        }
        Update: {
          block_id?: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          load?: string | null
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id?: string | null
          sets?: number | null
          tempo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programming_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "programming_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programming_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programming_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "programming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      programming_sessions: {
        Row: {
          block_id: string
          created_at: string
          day_offset: number
          id: string
          name: string
          notes: string | null
          position: number
          updated_at: string
        }
        Insert: {
          block_id: string
          created_at?: string
          day_offset?: number
          id?: string
          name?: string
          notes?: string | null
          position?: number
          updated_at?: string
        }
        Update: {
          block_id?: string
          created_at?: string
          day_offset?: number
          id?: string
          name?: string
          notes?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programming_sessions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "programming_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      programming_templates: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_weeks: number | null
          goal: string | null
          id: string
          is_published: boolean
          name: string
          team_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          is_published?: boolean
          name: string
          team_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          is_published?: boolean
          name?: string
          team_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          parent_team_id: string | null
          practitioner_count: number | null
          primary_color: string | null
          region: string | null
          retest_interval_days: number
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
          parent_team_id?: string | null
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          retest_interval_days?: number
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
          parent_team_id?: string | null
          practitioner_count?: number | null
          primary_color?: string | null
          region?: string | null
          retest_interval_days?: number
          secondary_color?: string | null
          setup_data?: Json | null
          stripe_account_id?: string | null
          subscription_status?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
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
          can_use_ai_coach: boolean
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
          can_use_ai_coach?: boolean
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
          can_use_ai_coach?: boolean
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
      acknowledge_integration_issue: {
        Args: {
          p_integration_name: string
          p_reason: string
          p_team_uuid: string
        }
        Returns: Json
      }
      can_access_program_assignment: {
        Args: { _assignment_id: string }
        Returns: boolean
      }
      can_access_programming_block: {
        Args: { _block_id: string }
        Returns: boolean
      }
      can_access_programming_template: {
        Args: { _template_id: string }
        Returns: boolean
      }
      can_access_team_row: { Args: { row_team_id: string }; Returns: boolean }
      claim_athlete_for_current_user: { Args: never; Returns: string }
      count_active_webhook_endpoints: { Args: never; Returns: number }
      count_unread_in_app_notifications: { Args: never; Returns: number }
      create_notification_campaign: {
        Args: {
          p_delivery_channel?: string
          p_message: string
          p_metadata?: Json
          p_target_type?: string
          p_target_value?: string
          p_title: string
        }
        Returns: string
      }
      create_webhook_endpoint: {
        Args: {
          p_is_active?: boolean
          p_label: string
          p_secret?: string
          p_team_id?: string
          p_url: string
        }
        Returns: string
      }
      delete_platform_tier_template: {
        Args: { p_id: string }
        Returns: boolean
      }
      delete_webhook_endpoint: {
        Args: { p_endpoint_id: string }
        Returns: boolean
      }
      dismiss_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      get_analytics_warehouse_overview: { Args: never; Returns: Json }
      get_athlete_by_consent_token: {
        Args: { _token: string }
        Returns: {
          consent_status: string
          name: string
        }[]
      }
      get_athletes_overview: { Args: never; Returns: Json }
      get_audit_event_detail: { Args: { event_id_in: string }; Returns: Json }
      get_audit_overview: { Args: never; Returns: Json }
      get_billing_overview: { Args: never; Returns: Json }
      get_bookings_overview: { Args: never; Returns: Json }
      get_bookings_trends: {
        Args: { days_back?: number }
        Returns: {
          cancelled_count: number
          created_count: number
          day: string
          sync_failure_count: number
        }[]
      }
      get_churn_risk_trend: {
        Args: { days_back?: number }
        Returns: {
          avg_churn_risk: number
          day: string
          high_risk_org_count: number
        }[]
      }
      get_default_branding_settings: { Args: never; Returns: Json }
      get_elite_benchmark_summary: {
        Args: never
        Returns: {
          age_group: number
          athlete_count: number
          avg_cmj_height: number
          avg_cmj_peak_power: number
          avg_imtp_peak: number
          avg_imtp_relative: number
          sport: string
          weight_category: string
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
      get_live_testing_overview: { Args: never; Returns: Json }
      get_my_api_key: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_team_id: { Args: never; Returns: string }
      get_my_workspace_team_ids: { Args: never; Returns: string[] }
      get_notification_campaign_detail: {
        Args: { campaign_uuid: string }
        Returns: Json
      }
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
      get_platform_settings: {
        Args: { p_category?: string }
        Returns: {
          category: string
          description: string
          id: string
          is_enabled: boolean
          key: string
          updated_at: string
          updated_by: string
          value: Json
        }[]
      }
      get_practitioner_engagement_trend: {
        Args: { days_back?: number }
        Returns: {
          active_practitioner_count: number
          avg_engagement_score: number
          day: string
        }[]
      }
      get_practitioner_engagement_trends: {
        Args: { days_back?: number }
        Returns: {
          active_count: number
          avg_engagement: number
          day: string
        }[]
      }
      get_practitioners_overview: { Args: never; Returns: Json }
      get_regional_testing_distribution: {
        Args: never
        Returns: {
          athlete_count: number
          country: string
          organisation_count: number
          region: string
          test_count: number
        }[]
      }
      get_reports_ai_overview: { Args: never; Returns: Json }
      get_reports_ai_trends: {
        Args: { days_back?: number }
        Returns: {
          ai_insights: number
          day: string
          failures: number
          reports_generated: number
          reports_sent: number
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
      get_sport_benchmark_distribution: {
        Args: never
        Returns: {
          athlete_count: number
          avg_cmj_height: number
          avg_imtp_peak: number
          sport: string
          test_count: number
        }[]
      }
      get_super_admin_health_snapshot: { Args: never; Returns: Json }
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
      get_tier_distribution: {
        Args: never
        Returns: {
          avg_seats: number
          monthly_revenue: number
          organisation_count: number
          percentage_of_total: number
          tier_name: string
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_super_admin_owner: { Args: { _user_id: string }; Returns: boolean }
      link_athlete_to_user: {
        Args: { athlete_uuid: string; user_uuid: string }
        Returns: string
      }
      link_client_to_athlete: {
        Args: {
          p_athlete_id: string
          p_created_by?: string
          p_team_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      list_athletes_global: {
        Args: {
          filter_activity?: string
          filter_consent?: string
          filter_team_id?: string
          row_limit?: number
          search_text?: string
          tested_this_month?: boolean
        }
        Returns: {
          activity_status: string
          age: number
          consent_status: string
          created_at: string
          email: string
          gender: string
          id: string
          last_test_at: string
          name: string
          organisation_name: string
          practitioner_email: string
          practitioner_name: string
          reports_sent: number
          team_id: string
          tests_logged: number
        }[]
      }
      list_billing_subscriptions: {
        Args: never
        Returns: {
          churn_risk_score: number
          created_at: string
          id: string
          last_activity_at: string
          monthly_value: number
          organisation_name: string
          payment_status: string
          renewal_date: string
          seat_count: number
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          team_id: string
          tier_name: string
        }[]
      }
      list_booking_failures: {
        Args: { row_limit?: number }
        Returns: {
          booking_id: string
          failure_reason: string
          id: string
          occurred_at: string
          organisation_name: string
          source: string
        }[]
      }
      list_feature_flags: {
        Args: never
        Returns: {
          description: string
          id: string
          is_enabled: boolean
          key: string
          updated_at: string
        }[]
      }
      list_my_in_app_notifications: {
        Args: { p_include_dismissed?: boolean; p_limit?: number }
        Returns: {
          campaign_id: string
          created_at: string
          dismissed_at: string
          id: string
          message: string
          metadata: Json
          read_at: string
          severity: string
          team_id: string
          title: string
        }[]
      }
      list_notification_campaigns: {
        Args: never
        Returns: {
          created_at: string
          created_by: string
          created_by_email: string
          delivered_count: number
          delivery_channel: string
          failed_count: number
          id: string
          message: string
          queued_at: string
          recipient_count: number
          sent_at: string
          status: string
          target_type: string
          target_value: string
          title: string
        }[]
      }
      list_organisation_audit_events: {
        Args: { row_limit?: number; team_uuid: string }
        Returns: {
          created_at: string
          event_source: string
          event_type: string
          id: string
          metadata: Json
          severity: string
          user_id: string
          user_label: string
        }[]
      }
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
      list_platform_audit_events: {
        Args: {
          end_date?: string
          filter_actor?: string
          filter_event_type?: string
          filter_severity?: string
          filter_source?: string
          filter_team_id?: string
          row_limit?: number
          search_text?: string
          start_date?: string
        }
        Returns: {
          actor_id: string
          actor_label: string
          event_id: string
          event_type: string
          metadata: Json
          occurred_at: string
          organisation_name: string
          severity: string
          source: string
          target_label: string
          team_id: string
        }[]
      }
      list_platform_tier_templates: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_bookings_per_month: number
          monthly_price: number
          name: string
          permissions: Json
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_tier_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_practitioners_overview: {
        Args: never
        Returns: {
          caseload: number
          created_at: string
          email: string
          engagement: string
          full_name: string
          last_login_at: string
          organisation_name: string
          reports_sent: number
          role: string
          setup_completed: boolean
          team_id: string
          user_id: string
        }[]
      }
      list_recent_tests_global: {
        Args: { row_limit?: number }
        Returns: {
          athlete_id: string
          athlete_name: string
          created_at: string
          id: string
          key_metric_label: string
          key_metric_value: number
          team_name: string
          test_name: string
          test_type: string
        }[]
      }
      list_reports_ai_activity: {
        Args: { row_limit?: number }
        Returns: {
          athlete_id: string
          created_at: string
          event_source: string
          event_type: string
          id: string
          metadata: Json
          organisation_name: string
          severity: string
          team_id: string
          user_id: string
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
      list_team_report_activity: {
        Args: { row_limit?: number; team_uuid: string }
        Returns: {
          athlete_id: string
          created_at: string
          duration_ms: number
          error_reason: string
          event_type: string
          filename: string
          id: string
          organisation_name: string
          report_type: string
          report_url: string
          severity: string
          status: string
          team_id: string
          test_count: number
        }[]
      }
      list_testing_anomalies: {
        Args: { row_limit?: number }
        Returns: {
          anomaly_type: string
          athlete_name: string
          created_at: string
          detail: string
          id: string
          severity: string
          team_name: string
          test_name: string
        }[]
      }
      list_unlinked_athletes_with_profile_matches: {
        Args: { team_uuid: string }
        Returns: {
          athlete_email: string
          athlete_id: string
          athlete_last_test_at: string
          athlete_name: string
          match_count: number
          match_email: string
          match_full_name: string
          match_profile_id: string
          match_role: string
          match_setup_completed: boolean
          match_user_id: string
        }[]
      }
      list_webhook_endpoints: {
        Args: never
        Returns: {
          created_at: string
          failure_reason: string
          has_secret: boolean
          id: string
          is_active: boolean
          label: string
          last_failure_at: string
          last_success_at: string
          team_id: string
          team_name: string
          updated_at: string
          url: string
        }[]
      }
      log_webhook_test_blocked: {
        Args: { p_endpoint_id: string; p_reason: string; p_url?: string }
        Returns: undefined
      }
      log_webhook_test_fired: {
        Args: {
          p_endpoint_id: string
          p_reason?: string
          p_status_code?: number
          p_success: boolean
        }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_webhook_endpoint_result: {
        Args: { p_endpoint_id: string; p_reason?: string; p_success: boolean }
        Returns: undefined
      }
      org_admin_list_team_credentials: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          password_hash: string
          role: string
          user_id: string
        }[]
      }
      preview_notification_audience: {
        Args: { p_target_type: string; p_target_value?: string }
        Returns: {
          churn_risk_score: number
          organisation_name: string
          owner_email: string
          subscription_status: string
          team_id: string
          tier_name: string
        }[]
      }
      queue_notification_campaign: {
        Args: { campaign_uuid: string }
        Returns: Json
      }
      reactivate_organisation: {
        Args: { reason: string; team_uuid: string }
        Returns: Json
      }
      record_cc_athletics_retry: {
        Args: {
          p_failure_reason?: string
          p_latency_ms?: number
          p_reason: string
          p_record_count?: number
          p_status: string
          p_team_uuid: string
        }
        Returns: Json
      }
      run_integration_health_check: {
        Args: { p_integration_name: string; p_team_uuid?: string }
        Returns: Json
      }
      send_organisation_message: {
        Args: { message: string; subject: string; team_uuid: string }
        Returns: Json
      }
      set_feature_flag: {
        Args: { p_enabled: boolean; p_key: string }
        Returns: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        SetofOptions: {
          from: "*"
          to: "platform_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_athlete_consent: {
        Args: { _signed_name: string; _token: string }
        Returns: boolean
      }
      suspend_organisation: {
        Args: { reason: string; team_uuid: string }
        Returns: Json
      }
      toggle_platform_tier_template: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_bookings_per_month: number
          monthly_price: number
          name: string
          permissions: Json
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "platform_tier_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_webhook_endpoint: {
        Args: { p_endpoint_id: string; p_is_active: boolean }
        Returns: boolean
      }
      unlink_athlete_user: {
        Args: { athlete_uuid: string; reason: string }
        Returns: string
      }
      update_default_branding_settings: {
        Args: { p_value: Json }
        Returns: Json
      }
      update_organisation_tier: {
        Args: { new_tier_name: string; reason: string; team_uuid: string }
        Returns: Json
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
      upsert_platform_setting: {
        Args: {
          p_category?: string
          p_description?: string
          p_key: string
          p_value: Json
        }
        Returns: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        SetofOptions: {
          from: "*"
          to: "platform_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_platform_tier_template: {
        Args: {
          p_description: string
          p_id: string
          p_is_active: boolean
          p_max_bookings_per_month: number
          p_monthly_price: number
          p_name: string
          p_permissions: Json
        }
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_bookings_per_month: number
          monthly_price: number
          name: string
          permissions: Json
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "platform_tier_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_webhook_url: { Args: { p_url: string }; Returns: string }
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
