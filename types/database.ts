export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'pro'
          subscription_status: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          custom_background_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          custom_background_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          custom_background_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: 'free' | 'pro'
          status: 'active' | 'canceled' | 'past_due'
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier?: 'free' | 'pro'
          status?: 'active' | 'canceled' | 'past_due'
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: 'free' | 'pro'
          status?: 'active' | 'canceled' | 'past_due'
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      usage: {
        Row: {
          id: string
          user_id: string
          month: string
          exports_count: number
          last_export_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          exports_count?: number
          last_export_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          exports_count?: number
          last_export_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          processed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_export_count: {
        Args: {
          p_user_id: string
        }
        Returns: {
          exports_count: number
          remaining: number
          limit_reached: boolean
        }
      }
      get_current_usage: {
        Args: {
          p_user_id: string
        }
        Returns: {
          exports_count: number
          exports_limit: number
          remaining: number
        }
      }
    }
    Enums: {
      subscription_tier: 'free' | 'pro'
      subscription_status: 'active' | 'canceled' | 'past_due'
    }
  }
}

// Helper types for convenience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export type Usage = Database['public']['Tables']['usage']['Row']
export type UsageInsert = Database['public']['Tables']['usage']['Insert']
export type UsageUpdate = Database['public']['Tables']['usage']['Update']

export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row']
export type WebhookEventInsert = Database['public']['Tables']['webhook_events']['Insert']

export type SubscriptionTier = Database['public']['Enums']['subscription_tier']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
