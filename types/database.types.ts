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
          file_url: string;
          config_color: 'color' | 'bw';
          config_copies: number;
          config_paper_size: 'a4' | 'a3' | 'a5';
          config_binding: 'none' | 'stapled' | 'spiral';
          total_pages: number;
          status: 'pending' | 'rendering' | 'printing' | 'completed' | 'failed';
          cost: number;
          printer_location: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_url: string;
          config_color: 'color' | 'bw';
          config_copies?: number;
          config_paper_size: 'a4' | 'a3' | 'a5';
          config_binding: 'none' | 'stapled' | 'spiral';
          total_pages: number;
          status?: 'pending' | 'rendering' | 'printing' | 'completed' | 'failed';
          cost: number;
          printer_location: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_url?: string;
          config_color?: 'color' | 'bw';
          config_copies?: number;
          config_paper_size?: 'a4' | 'a3' | 'a5';
          config_binding?: 'none' | 'stapled' | 'spiral';
          total_pages?: number;
          status?: 'pending' | 'rendering' | 'printing' | 'completed' | 'failed';
          cost?: number;
          printer_location?: string;
          created_at?: string;
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
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
