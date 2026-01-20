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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_id: string
          cost_pool_id: string
          created_at: string
          id: string
          metric_id: string | null
          name: string
          service_id: string
          tower_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          cost_pool_id: string
          created_at?: string
          id?: string
          metric_id?: string | null
          name: string
          service_id: string
          tower_id: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          cost_pool_id?: string
          created_at?: string
          id?: string
          metric_id?: string | null
          name?: string
          service_id?: string
          tower_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_allocations: {
        Row: {
          activities: Json
          activity_totals: Json
          allocation_matrix: Json
          cost_pool_id: string
          created_at: string
          id: string
          service: string
          tower: string
          updated_at: string
        }
        Insert: {
          activities: Json
          activity_totals: Json
          allocation_matrix: Json
          cost_pool_id: string
          created_at?: string
          id?: string
          service: string
          tower: string
          updated_at?: string
        }
        Update: {
          activities?: Json
          activity_totals?: Json
          allocation_matrix?: Json
          cost_pool_id?: string
          created_at?: string
          id?: string
          service?: string
          tower?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_pool_assignments: {
        Row: {
          cost_pool_id: string
          created_at: string
          id: string
          org_unit: string
          service_id: string
          tower_id: string
          updated_at: string
        }
        Insert: {
          cost_pool_id: string
          created_at?: string
          id?: string
          org_unit: string
          service_id: string
          tower_id: string
          updated_at?: string
        }
        Update: {
          cost_pool_id?: string
          created_at?: string
          id?: string
          org_unit?: string
          service_id?: string
          tower_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_pools: {
        Row: {
          created_at: string
          id: string
          name: string
          service_id: string
          source_le: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          service_id: string
          source_le?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          service_id?: string
          source_le?: string
          updated_at?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          active_le_map: Json
          created_at: string
          franchise_percentages: Json
          id: string
          le_allocations: Json
          metric_id: string
          name: string
          selected_years: Json
          service: string
          service_id: string
          source_le: string
          tower_id: string
          updated_at: string
        }
        Insert: {
          active_le_map?: Json
          created_at?: string
          franchise_percentages?: Json
          id?: string
          le_allocations?: Json
          metric_id: string
          name: string
          selected_years?: Json
          service: string
          service_id: string
          source_le: string
          tower_id: string
          updated_at?: string
        }
        Update: {
          active_le_map?: Json
          created_at?: string
          franchise_percentages?: Json
          id?: string
          le_allocations?: Json
          metric_id?: string
          name?: string
          selected_years?: Json
          service?: string
          service_id?: string
          source_le?: string
          tower_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_unit_assignments: {
        Row: {
          created_at: string
          id: string
          org_unit: string
          service_id: string
          tower_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_unit: string
          service_id: string
          tower_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_unit?: string
          service_id?: string
          tower_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_unit_costs: {
        Row: {
          area: string
          cost_value: number
          created_at: string
          expense_group: string
          expense_type: string
          fte_value: number
          id: string
          org_unit: string
          scenario: string
          source_le: string
          tower_id: string
          updated_at: string
        }
        Insert: {
          area: string
          cost_value?: number
          created_at?: string
          expense_group: string
          expense_type: string
          fte_value?: number
          id?: string
          org_unit: string
          scenario: string
          source_le: string
          tower_id: string
          updated_at?: string
        }
        Update: {
          area?: string
          cost_value?: number
          created_at?: string
          expense_group?: string
          expense_type?: string
          fte_value?: number
          id?: string
          org_unit?: string
          scenario?: string
          source_le?: string
          tower_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: string | null
          area: string | null
          catalogue: string | null
          created_at: string
          franchise: string | null
          id: string
          name: string
          recipient_le: string | null
          scenario: string | null
          source_le: string
          tower_id: string
          updated_at: string
        }
        Insert: {
          active?: string | null
          area?: string | null
          catalogue?: string | null
          created_at?: string
          franchise?: string | null
          id: string
          name: string
          recipient_le?: string | null
          scenario?: string | null
          source_le?: string
          tower_id: string
          updated_at?: string
        }
        Update: {
          active?: string | null
          area?: string | null
          catalogue?: string | null
          created_at?: string
          franchise?: string | null
          id?: string
          name?: string
          recipient_le?: string | null
          scenario?: string | null
          source_le?: string
          tower_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tech_app_assignments: {
        Row: {
          app: string
          assigned_services: Json | null
          bucket_type: string | null
          created_at: string
          department: string
          id: string
          updated_at: string
        }
        Insert: {
          app: string
          assigned_services?: Json | null
          bucket_type?: string | null
          created_at?: string
          department: string
          id?: string
          updated_at?: string
        }
        Update: {
          app?: string
          assigned_services?: Json | null
          bucket_type?: string | null
          created_at?: string
          department?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tech_apps: {
        Row: {
          app: string
          area: string
          cost_value: number
          created_at: string
          department: string
          id: string
          scenario: string
          source_le: string
          updated_at: string
        }
        Insert: {
          app: string
          area: string
          cost_value?: number
          created_at?: string
          department: string
          id?: string
          scenario: string
          source_le: string
          updated_at?: string
        }
        Update: {
          app?: string
          area?: string
          cost_value?: number
          created_at?: string
          department?: string
          id?: string
          scenario?: string
          source_le?: string
          updated_at?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
