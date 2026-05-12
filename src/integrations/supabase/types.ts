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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookmarks_local: {
        Row: {
          ayah: number
          created_at: string
          id: string
          qf_bookmark_id: string | null
          surah: number
          user_id: string
        }
        Insert: {
          ayah: number
          created_at?: string
          id?: string
          qf_bookmark_id?: string | null
          surah: number
          user_id: string
        }
        Update: {
          ayah?: number
          created_at?: string
          id?: string
          qf_bookmark_id?: string | null
          surah?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_local_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items_local: {
        Row: {
          ayah: number
          collection_id: string
          created_at: string
          id: string
          qf_item_id: string | null
          surah: number
        }
        Insert: {
          ayah: number
          collection_id: string
          created_at?: string
          id?: string
          qf_item_id?: string | null
          surah: number
        }
        Update: {
          ayah?: number
          collection_id?: string
          created_at?: string
          id?: string
          qf_item_id?: string | null
          surah?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_local_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_local"
            referencedColumns: ["id"]
          },
        ]
      }
      collections_local: {
        Row: {
          created_at: string
          id: string
          name: string
          qf_collection_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          qf_collection_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          qf_collection_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_local_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          ayah: number
          color: Database["public"]["Enums"]["highlight_color"]
          surah: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ayah: number
          color: Database["public"]["Enums"]["highlight_color"]
          surah: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ayah?: number
          color?: Database["public"]["Enums"]["highlight_color"]
          surah?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intentions: {
        Row: {
          ayah: number
          carry_forward_count: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["intention_kind"]
          lived_at: string | null
          parent_id: string | null
          reflection_id: string | null
          reminder_at: string | null
          status: Database["public"]["Enums"]["intention_status"]
          surah: number
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ayah: number
          carry_forward_count?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["intention_kind"]
          lived_at?: string | null
          parent_id?: string | null
          reflection_id?: string | null
          reminder_at?: string | null
          status?: Database["public"]["Enums"]["intention_status"]
          surah: number
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ayah?: number
          carry_forward_count?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["intention_kind"]
          lived_at?: string | null
          parent_id?: string | null
          reflection_id?: string | null
          reminder_at?: string | null
          status?: Database["public"]["Enums"]["intention_status"]
          surah?: number
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intentions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "intentions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intentions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_state: {
        Row: {
          current_ayah: number
          current_surah: number
          paused_journey: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_ayah?: number
          current_surah?: number
          paused_journey?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_ayah?: number
          current_surah?: number
          paused_journey?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          id: string
          intention_id: string | null
          opened_at: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          intention_id?: string | null
          opened_at?: string | null
          sent_at?: string
        }
        Update: {
          id?: string
          intention_id?: string | null
          opened_at?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_intention_id_fkey"
            columns: ["intention_id"]
            isOneToOne: false
            referencedRelation: "intentions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          notification_pref: string | null
          onboarded_at: string | null
          qf_initial_sync_started_at: string | null
          qf_initial_synced_at: string | null
          qf_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_pref?: string | null
          onboarded_at?: string | null
          qf_initial_sync_started_at?: string | null
          qf_initial_synced_at?: string | null
          qf_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_pref?: string | null
          onboarded_at?: string | null
          qf_initial_sync_started_at?: string | null
          qf_initial_synced_at?: string | null
          qf_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_revisited: {
        Row: {
          ayah: number
          id: string
          surah: number
          user_id: string
          visited_at: string
        }
        Insert: {
          ayah: number
          id?: string
          surah: number
          user_id: string
          visited_at?: string
        }
        Update: {
          ayah?: number
          id?: string
          surah?: number
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_revisited_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections_local: {
        Row: {
          ayah: number
          body: string
          created_at: string
          id: string
          qf_post_id: string | null
          surah: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ayah: number
          body: string
          created_at?: string
          id?: string
          qf_post_id?: string | null
          surah: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ayah?: number
          body?: string
          created_at?: string
          id?: string
          qf_post_id?: string | null
          surah?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_local_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_failures: {
        Row: {
          created_at: string
          error: string | null
          id: string
          operation: string
          payload: Json | null
          resource: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          operation: string
          payload?: Json | null
          resource: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          operation?: string
          payload?: Json | null
          resource?: string
          user_id?: string
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
      highlight_color: "gold" | "blue" | "green" | "purple"
      intention_kind: "ai" | "custom"
      intention_status:
        | "pending"
        | "awaiting_response"
        | "lived"
        | "carried"
        | "paused"
        | "removed"
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
      highlight_color: ["gold", "blue", "green", "purple"],
      intention_kind: ["ai", "custom"],
      intention_status: [
        "pending",
        "awaiting_response",
        "lived",
        "carried",
        "paused",
        "removed",
      ],
    },
  },
} as const
