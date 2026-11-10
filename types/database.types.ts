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
          onboarding_step: number | null;
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
          onboarding_step?: number | null;
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
          onboarding_step?: number | null;
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
          city: string | null;
          format: "in_person" | "online";
          venue_address: string | null;
          venue_latitude: number | null;
          venue_longitude: number | null;
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
          city?: string | null;
          format: "in_person" | "online";
          venue_address?: string | null;
          venue_latitude?: number | null;
          venue_longitude?: number | null;
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
          city?: string | null;
          format?: "in_person" | "online";
          venue_address?: string | null;
          venue_latitude?: number | null;
          venue_longitude?: number | null;
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
          card_style: string;
          card_finish: string;
          card_text_color: string;
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
          card_style?: string;
          card_finish?: string;
          card_text_color?: string;
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
          card_style?: string;
          card_finish?: string;
          card_text_color?: string;
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
          idempotency_key: string | null;
          total_kobo: number;
          payment_status: "pending" | "failed" | "success";
          paystack_authorization_url: string | null;
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
          idempotency_key?: string | null;
          total_kobo: number;
          payment_status?: "pending" | "failed" | "success";
          paystack_authorization_url?: string | null;
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
          idempotency_key?: string | null;
          total_kobo?: number;
          payment_status?: "pending" | "failed" | "success";
          paystack_authorization_url?: string | null;
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
    Functions: {
      get_organizer_dashboard_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_organizer_event_dashboard: {
        Args: { p_event_id: string };
        Returns: Json;
      };
      get_door_staff_scan_context: {
        Args: { p_event_id: string; p_token_hash: string };
        Returns: Json;
      };
      validate_door_staff_access: {
        Args: { p_event_id: string; p_token_hash: string };
        Returns: Json;
      };
      get_ticket_event_details: {
        Args: { p_event_ids: string[] };
        Returns: {
          id: string;
          title: string;
          starts_at: string;
          ends_at: string;
          format: Database["public"]["Enums"]["event_format"];
          city: string | null;
          venue_address: string | null;
        }[];
      };
      get_event_paystack_subaccount: {
        Args: { p_event_id: string };
        Returns: string | null;
      };
      reserve_ticket_inventory: {
        Args: {
          p_ticket_type_id: string;
          p_quantity: number;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      save_reservation_authorization_url: {
        Args: {
          p_reservation_id: string;
          p_authorization_url: string;
        };
        Returns: boolean;
      };
      issue_free_ticket_order: {
        Args: {
          p_ticket_type_id: string;
          p_quantity: number;
          p_idempotency_key: string;
          p_user_id: string;
          p_ticket_payloads: Json;
        };
        Returns: Json;
      };
      release_expired_reservation: {
        Args: { p_reservation_id: string };
        Returns: boolean;
      };
      mark_payment_failed: {
        Args: { p_event_id: string; p_reservation_id: string | null };
        Returns: Json;
      };
      process_paid_reservation: {
        Args: {
          p_event_id: string;
          p_reservation_id: string;
          p_amount_kobo: number;
          p_commission_kobo: number;
          p_ticket_payloads: Json;
        };
        Returns: Json;
      };
      save_onboarding_ticket_tiers: {
        Args: { p_event_id: string; p_tiers: Json };
        Returns: { tier_id: string; position: number }[];
      };
      scan_door_staff_ticket: {
        Args: { p_event_id: string; p_token_hash: string; p_ticket_id: string };
        Returns: Json;
      };
      publish_onboarding_event: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      save_draft_online_event_join_url: {
        Args: { p_event_id: string; p_join_url: string | null };
        Returns: boolean;
      };
      get_draft_online_event_join_url: {
        Args: { p_event_id: string };
        Returns: string | null;
      };
      get_online_event_join_access: {
        Args: { p_ticket_id: string };
        Returns: {
          event_title: string;
          starts_at: string;
          unlock_at: string;
          server_now: string;
          is_unlocked: boolean;
          join_url: string | null;
        }[];
      };
    };
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
