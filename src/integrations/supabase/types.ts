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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bitrix_activities: {
        Row: {
          activity_id: string
          company_id: string
          completed: boolean
          created_at: string | null
          deadline: string | null
          owner_id: string | null
          owner_type_id: string | null
          responsible_id: string | null
          subject: string | null
          synced_at: string
          type: string
        }
        Insert: {
          activity_id: string
          company_id: string
          completed?: boolean
          created_at?: string | null
          deadline?: string | null
          owner_id?: string | null
          owner_type_id?: string | null
          responsible_id?: string | null
          subject?: string | null
          synced_at?: string
          type?: string
        }
        Update: {
          activity_id?: string
          company_id?: string
          completed?: boolean
          created_at?: string | null
          deadline?: string | null
          owner_id?: string | null
          owner_type_id?: string | null
          responsible_id?: string | null
          subject?: string | null
          synced_at?: string
          type?: string
        }
        Relationships: []
      }
      bitrix_connections: {
        Row: {
          access_token: string
          client_endpoint: string
          company_id: string
          connected_at: string
          connected_by: string
          deals_count: number
          domain: string
          expires_at: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          member_id: string
          refresh_token: string
        }
        Insert: {
          access_token: string
          client_endpoint: string
          company_id: string
          connected_at?: string
          connected_by: string
          deals_count?: number
          domain: string
          expires_at: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          member_id: string
          refresh_token: string
        }
        Update: {
          access_token?: string
          client_endpoint?: string
          company_id?: string
          connected_at?: string
          connected_by?: string
          deals_count?: number
          domain?: string
          expires_at?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          member_id?: string
          refresh_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bitrix_deals: {
        Row: {
          assigned_by_id: string | null
          category_id: string | null
          close_date: string | null
          closed: boolean
          company_id: string
          currency: string | null
          date_create: string | null
          date_modify: string | null
          deal_id: string
          opportunity: number
          stage_id: string | null
          synced_at: string
          title: string | null
        }
        Insert: {
          assigned_by_id?: string | null
          category_id?: string | null
          close_date?: string | null
          closed?: boolean
          company_id: string
          currency?: string | null
          date_create?: string | null
          date_modify?: string | null
          deal_id: string
          opportunity?: number
          stage_id?: string | null
          synced_at?: string
          title?: string | null
        }
        Update: {
          assigned_by_id?: string | null
          category_id?: string | null
          close_date?: string | null
          closed?: boolean
          company_id?: string
          currency?: string | null
          date_create?: string | null
          date_modify?: string | null
          deal_id?: string
          opportunity?: number
          stage_id?: string | null
          synced_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bitrix_oauth_states: {
        Row: {
          company_id: string
          created_at: string
          domain: string
          nonce: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          domain: string
          nonce: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          domain?: string
          nonce?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_oauth_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bitrix_stages: {
        Row: {
          category_id: string | null
          category_name: string | null
          company_id: string
          name: string
          semantics: string | null
          sort: number | null
          stage_id: string
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          company_id: string
          name: string
          semantics?: string | null
          sort?: number | null
          stage_id: string
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          company_id?: string
          name?: string
          semantics?: string | null
          sort?: number | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bitrix_tasks: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string | null
          deadline: string | null
          responsible_id: string | null
          status: string | null
          synced_at: string
          task_id: string
          title: string | null
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string | null
          deadline?: string | null
          responsible_id?: string | null
          status?: string | null
          synced_at?: string
          task_id: string
          title?: string | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string | null
          deadline?: string | null
          responsible_id?: string | null
          status?: string | null
          synced_at?: string
          task_id?: string
          title?: string | null
        }
        Relationships: []
      }
      bitrix_users: {
        Row: {
          active: boolean | null
          company_id: string
          department: string | null
          name: string
          photo: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          company_id: string
          department?: string | null
          name: string
          photo?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          company_id?: string
          department?: string | null
          name?: string
          photo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          seller_ref: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          seller_ref?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          seller_ref?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      user_layouts: {
        Row: {
          company_id: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_layouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bitrix_status: {
        Args: { _company_id: string }
        Returns: {
          connected_at: string
          deals_count: number
          domain: string
          last_sync_at: string
          last_sync_error: string
          last_sync_status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      member_role_of: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
    }
    Enums: {
      app_role: "admin"
      member_role: "gestor" | "colaborador"
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
  public: {
    Enums: {
      app_role: ["admin"],
      member_role: ["gestor", "colaborador"],
    },
  },
} as const
