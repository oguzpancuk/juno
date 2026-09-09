export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          from_id: string
          kind: Database["public"]["Enums"]["like_kind"]
          starter_key: string | null
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          kind: Database["public"]["Enums"]["like_kind"]
          starter_key?: string | null
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          kind?: Database["public"]["Enums"]["like_kind"]
          starter_key?: string | null
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          a: string
          b: string
          created_at: string
          id: string
          starter_key: string
        }
        Insert: {
          a: string
          b: string
          created_at?: string
          id?: string
          starter_key: string
        }
        Update: {
          a?: string
          b?: string
          created_at?: string
          id?: string
          starter_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_a_fkey"
            columns: ["a"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_a_fkey"
            columns: ["a"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_a_fkey"
            columns: ["a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_b_fkey"
            columns: ["b"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_b_fkey"
            columns: ["b"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_b_fkey"
            columns: ["b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          big_three: Json
          birth_city_id: number
          birth_date: string
          birth_local: string
          birth_utc: string
          chart: Json
          created_at: string
          display_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          interested_in: Database["public"]["Enums"]["interest"]
          location: unknown
          radius_km: number
          updated_at: string
        }
        Insert: {
          big_three: Json
          birth_city_id: number
          birth_date: string
          birth_local: string
          birth_utc: string
          chart: Json
          created_at?: string
          display_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          interested_in: Database["public"]["Enums"]["interest"]
          location: unknown
          radius_km?: number
          updated_at?: string
        }
        Update: {
          big_three?: Json
          birth_city_id?: number
          birth_date?: string
          birth_local?: string
          birth_utc?: string
          chart?: Json
          created_at?: string
          display_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          interested_in?: Database["public"]["Enums"]["interest"]
          location?: unknown
          radius_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string | null
          reporter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      discover: {
        Row: {
          age: number | null
          big_three: Json | null
          chart: Json | null
          display_name: string | null
          distance_km: number | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string | null
        }
        Relationships: []
      }
      match_profiles: {
        Row: {
          age: number | null
          big_three: Json | null
          chart: Json | null
          display_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string | null
          last_at: string | null
          last_body: string | null
          last_sender_id: string | null
          match_id: string | null
          matched_at: string | null
          starter_key: string | null
          unread_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "discover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      my_reports: {
        Row: {
          created_at: string | null
          id: string | null
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"] | null
          reported_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"] | null
          reported_id?: never
        }
        Update: {
          created_at?: string | null
          id?: string | null
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"] | null
          reported_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      profile_location_text: { Args: { profile_id: string }; Returns: string }
    }
    Enums: {
      gender: "woman" | "man" | "unspecified"
      interest: "women" | "men" | "everyone"
      like_kind: "like" | "pass"
      report_reason:
        | "spam"
        | "harassment"
        | "nudity"
        | "fake_profile"
        | "underage"
        | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      gender: ["woman", "man", "unspecified"],
      interest: ["women", "men", "everyone"],
      like_kind: ["like", "pass"],
      report_reason: [
        "spam",
        "harassment",
        "nudity",
        "fake_profile",
        "underage",
        "other",
      ],
    },
  },
} as const

