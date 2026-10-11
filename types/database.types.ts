export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          is_organizer: boolean;
          organizer_name: string | null;
          organizer_bio: string | null;
          logo_url: string | null;
          onboarding_step: number;
          paystack_subaccount_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          is_organizer?: boolean;
          organizer_name?: string | null;
          organizer_bio?: string | null;
          logo_url?: string | null;
          onboarding_step?: number;
          paystack_subaccount_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          is_organizer?: boolean;
          organizer_name?: string | null;
          organizer_bio?: string | null;
          logo_url?: string | null;
          onboarding_step?: number;
          paystack_subaccount_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organizer_id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          category: string;
          format: "in_person" | "online";
          venue_address: string | null;
          online_join_url: string | null;
          starts_at: string;
          ends_at: string;
          status: "draft" | "published";
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          category: string;
          format: "in_person" | "online";
          venue_address?: string | null;
          online_join_url?: string | null;
          starts_at: string;
          ends_at: string;
          status?: "draft" | "published";
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organizer_id?: string;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          category?: string;
          format?: "in_person" | "online";
          venue_address?: string | null;
          online_join_url?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: "draft" | "published";
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_types: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          price_kobo: number;
          quantity_available: number;
          quantity_sold: number;
          card_color: string | null;
          card_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          price_kobo: number;
          quantity_available: number;
          quantity_sold?: number;
          card_color?: string | null;
          card_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          price_kobo?: number;
          quantity_available?: number;
          quantity_sold?: number;
          card_color?: string | null;
          card_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          ticket_type_id: string;
          quantity: number;
          user_id: string;
          expires_at: string;
          status: "pending" | "confirmed" | "expired";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_type_id: string;
          quantity: number;
          user_id: string;
          expires_at: string;
          status?: "pending" | "confirmed" | "expired";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_type_id?: string;
          quantity?: number;
          user_id?: string;
          expires_at?: string;
          status?: "pending" | "confirmed" | "expired";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          total_kobo: number;
          commission_kobo: number;
          paystack_reference: string;
          status: "pending" | "paid" | "failed" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          total_kobo: number;
          commission_kobo: number;
          paystack_reference: string;
          status?: "pending" | "paid" | "failed" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          total_kobo?: number;
          commission_kobo?: number;
          paystack_reference?: string;
          status?: "pending" | "paid" | "failed" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          id: string;
          order_id: string;
          ticket_type_id: string;
          owner_id: string;
          qr_token: string;
          status: "issued" | "used" | "void";
          scanned_at: string | null;
          scanned_gate_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          ticket_type_id: string;
          owner_id: string;
          qr_token: string;
          status?: "issued" | "used" | "void";
          scanned_at?: string | null;
          scanned_gate_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          ticket_type_id?: string;
          owner_id?: string;
          qr_token?: string;
          status?: "issued" | "used" | "void";
          scanned_at?: string | null;
          scanned_gate_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
      door_staff_access: {
        Row: {
          id: string;
          event_id: string;
          gate_label: string;
          access_token_hash: string;
          created_by: string;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          gate_label: string;
          access_token_hash: string;
          created_by: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          gate_label?: string;
          access_token_hash?: string;
          created_by?: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "door_staff_access_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      processed_webhook_events: {
        Row: {
          event_id: string;
          processed_at: string;
        };
        Insert: {
          event_id: string;
          processed_at?: string;
        };
        Update: {
          event_id?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      event_format: "in_person" | "online";
      event_status: "draft" | "published";
      reservation_status: "pending" | "confirmed" | "expired";
      order_status: "pending" | "paid" | "failed" | "cancelled";
      ticket_status: "issued" | "used" | "void";
    };
    CompositeTypes: Record<string, never>;
  };
};
