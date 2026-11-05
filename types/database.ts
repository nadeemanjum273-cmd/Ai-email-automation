export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'client';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type PaymentMethod = 'JazzCash' | 'Easypaisa' | 'Bank Transfer';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'canceled';

export type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  daily_email_limit: number;
  monthly_email_limit: number;
  daily_emails_sent: number;
  monthly_emails_sent: number;
  last_reset_date?: string | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRequestRow = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  sender_number?: string | null;
  transaction_id: string;
  screenshot_url: string;
  status: PaymentStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRequest = PaymentRequestRow & {
  profiles?: Profile | null;
};

export type GoogleConnection = {
  id: string;
  user_id: string;
  google_email: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
};

export type Campaign = {
  id: string;
  user_id: string;
  title: string;
  sheet_url: string;
  sheet_id: string;
  sheet_name: string;
  column_name: string;
  column_email: string;
  column_niche: string;
  column_status: string;
  subject_template: string;
  body_template: string;
  batch_size: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: {
          id?: string;
          user_id: string;
          plan_name?: string;
          status?: SubscriptionStatus;
          daily_email_limit?: number;
          monthly_email_limit?: number;
          daily_emails_sent?: number;
          monthly_emails_sent?: number;
          last_reset_date?: string | null;
          starts_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_name?: string;
          status?: SubscriptionStatus;
          daily_email_limit?: number;
          monthly_email_limit?: number;
          daily_emails_sent?: number;
          monthly_emails_sent?: number;
          last_reset_date?: string | null;
          starts_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_requests: {
        Row: PaymentRequestRow;
        Insert: {
          id?: string;
          user_id: string;
          amount?: number;
          currency?: string;
          payment_method: PaymentMethod;
          sender_number?: string | null;
          transaction_id: string;
          screenshot_url: string;
          status?: PaymentStatus;
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          payment_method?: PaymentMethod;
          sender_number?: string | null;
          transaction_id?: string;
          screenshot_url?: string;
          status?: PaymentStatus;
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      google_connections: {
        Row: GoogleConnection;
        Insert: {
          id?: string;
          user_id: string;
          google_email: string;
          access_token: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          is_connected?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_email?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          is_connected?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: Campaign;
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          sheet_url: string;
          sheet_id: string;
          sheet_name?: string;
          column_name: string;
          column_email: string;
          column_niche: string;
          column_status: string;
          subject_template: string;
          body_template: string;
          batch_size?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          sheet_url?: string;
          sheet_id?: string;
          sheet_name?: string;
          column_name?: string;
          column_email?: string;
          column_niche?: string;
          column_status?: string;
          subject_template?: string;
          body_template?: string;
          batch_size?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
