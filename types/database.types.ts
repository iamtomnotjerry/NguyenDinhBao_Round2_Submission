export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          reward_points: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          reward_points?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          reward_points?: number;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          stock: number;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          stock: number;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          stock?: number;
          image_url?: string | null;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          total_amount: number;
          discount_amount: number;
          points_used: number;
          points_earned: number;
          delivery_type: 'pickup' | 'delivery';
          status: 'pending' | 'paid' | 'failed' | 'completed';
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_amount: number;
          discount_amount?: number;
          points_used?: number;
          points_earned?: number;
          delivery_type: 'pickup' | 'delivery';
          status?: 'pending' | 'paid' | 'failed' | 'completed';
          idempotency_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_amount?: number;
          discount_amount?: number;
          points_used?: number;
          points_earned?: number;
          delivery_type?: 'pickup' | 'delivery';
          status?: 'pending' | 'paid' | 'failed' | 'completed';
          idempotency_key?: string | null;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          price?: number;
        };
      };
      print_jobs: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          config_color: 'color' | 'bw' | 'mixed';
          config_copies: number;
          config_paper_size: 'a4' | 'a3' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'b5' | 'custom';
          config_binding: 'none' | 'stapled' | 'spiral' | 'glue' | 'hardcover';
          total_pages: number;
          status:
            | 'pending'
            | 'awaiting_payment'
            | 'paid'
            | 'queued'
            | 'rendering'
            | 'printing'
            | 'finishing'
            | 'quality_check'
            | 'packing'
            | 'shipping'
            | 'ready_for_pickup'
            | 'completed'
            | 'failed';
          cost: number;
          printer_location: string;
          created_at: string;
          config_json: Json;
          page_selection: string | null;
          selected_page_count: number | null;
          duplex: 'simplex' | 'long_edge' | 'short_edge';
          delivery_type: 'pickup' | 'delivery';
          delivery_address: string | null;
          shipping_fee: number;
          tax_amount: number;
          discount_amount: number;
          points_used: number;
          points_earned: number;
          idempotency_key: string | null;
          card_last4: string | null;
          estimated_ready: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_path: string;
          config_color: 'color' | 'bw' | 'mixed';
          config_copies?: number;
          config_paper_size: 'a4' | 'a3' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'b5' | 'custom';
          config_binding: 'none' | 'stapled' | 'spiral' | 'glue' | 'hardcover';
          total_pages: number;
          status?:
            | 'pending'
            | 'awaiting_payment'
            | 'paid'
            | 'queued'
            | 'rendering'
            | 'printing'
            | 'finishing'
            | 'quality_check'
            | 'packing'
            | 'shipping'
            | 'ready_for_pickup'
            | 'completed'
            | 'failed';
          cost: number;
          printer_location: string;
          created_at?: string;
          config_json?: Json;
          page_selection?: string | null;
          selected_page_count?: number | null;
          duplex?: 'simplex' | 'long_edge' | 'short_edge';
          delivery_type?: 'pickup' | 'delivery';
          delivery_address?: string | null;
          shipping_fee?: number;
          tax_amount?: number;
          discount_amount?: number;
          points_used?: number;
          points_earned?: number;
          idempotency_key?: string | null;
          card_last4?: string | null;
          estimated_ready?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_path?: string;
          config_color?: 'color' | 'bw' | 'mixed';
          config_copies?: number;
          config_paper_size?: 'a4' | 'a3' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'b5' | 'custom';
          config_binding?: 'none' | 'stapled' | 'spiral' | 'glue' | 'hardcover';
          total_pages?: number;
          status?:
            | 'pending'
            | 'awaiting_payment'
            | 'paid'
            | 'queued'
            | 'rendering'
            | 'printing'
            | 'finishing'
            | 'quality_check'
            | 'packing'
            | 'shipping'
            | 'ready_for_pickup'
            | 'completed'
            | 'failed';
          cost?: number;
          printer_location?: string;
          created_at?: string;
          config_json?: Json;
          page_selection?: string | null;
          selected_page_count?: number | null;
          duplex?: 'simplex' | 'long_edge' | 'short_edge';
          delivery_type?: 'pickup' | 'delivery';
          delivery_address?: string | null;
          shipping_fee?: number;
          tax_amount?: number;
          discount_amount?: number;
          points_used?: number;
          points_earned?: number;
          idempotency_key?: string | null;
          card_last4?: string | null;
          estimated_ready?: string | null;
        };
      };
      payment_tokens: {
        Row: {
          id: string;
          user_id: string;
          card_token: string;
          card_brand: string;
          last4: string;
          exp_month: number;
          exp_year: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_token: string;
          card_brand: string;
          last4: string;
          exp_month: number;
          exp_year: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_token?: string;
          card_brand?: string;
          last4?: string;
          exp_month?: number;
          exp_year?: number;
          is_default?: boolean;
          created_at?: string;
        };
      };
      reward_points_history: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          type: 'earn' | 'spend';
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          type: 'earn' | 'spend';
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number;
          type?: 'earn' | 'spend';
          description?: string | null;
          created_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          status: 'active' | 'waiting_support' | 'closed';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'active' | 'waiting_support' | 'closed';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'active' | 'waiting_support' | 'closed';
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          sender: 'user' | 'ai' | 'support';
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          sender: 'user' | 'ai' | 'support';
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          sender?: 'user' | 'ai' | 'support';
          message?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_order_with_stock_check: {
        Args: {
          p_user_id: string;
          p_total_amount: number;
          p_discount_amount: number;
          p_points_used: number;
          p_points_earned: number;
          p_delivery_type: string;
          p_idempotency_key: string;
          p_items: Json;
        };
        Returns: string;
      };
      rollback_failed_order: {
        Args: {
          p_order_id: string;
        };
        Returns: unknown;
      };
      mark_order_as_paid: {
        Args: {
          p_order_id: string;
        };
        Returns: unknown;
      };
      settle_print_job_points: {
        Args: {
          p_user_id: string;
          p_points_used: number;
          p_points_earned: number;
          p_job_id: string;
        };
        Returns: undefined;
      };
      rollback_print_job_points: {
        Args: {
          p_user_id: string;
          p_points_used: number;
          p_points_earned: number;
          p_job_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/**
 * Enterprise-grade wrapper that patches missing generated Relationships types.
 * Without this, newer versions of @supabase/supabase-js fallback to 'never' typings on table operations.
 */
export type SafeDatabase = {
  public: {
    Tables: {
      [K in keyof Database['public']['Tables']]: Database['public']['Tables'][K] & {
        Relationships: [];
      };
    };
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
    Enums: Database['public']['Enums'];
  };
};
