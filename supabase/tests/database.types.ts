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
      likes: {
        Row: {
          created_at: string
          from_id: string
          kind: Database["public"]["Enums"]["like_kind"]
          starter: string | null
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          kind: Database["public"]["Enums"]["like_kind"]
          starter?: string | null
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          kind?: Database["public"]["Enums"]["like_kind"]
          starter?: string | null
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
          starter: string
        }
        Insert: {
          a: string
          b: string
          created_at?: string
          id?: string
          starter?: string
        }
        Update: {
          a?: string
          b?: string
          created_at?: string
          id?: string
          starter?: string
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
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gender: "woman" | "man" | "unspecified"
      interest: "women" | "men" | "everyone"
      like_kind: "like" | "pass"
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
    },
  },
} as const

