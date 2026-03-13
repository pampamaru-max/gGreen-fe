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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: number
          is_default: boolean
          max_score: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_default?: boolean
          max_score?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_default?: boolean
          max_score?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          bg_image_url: string | null
          body_text: string
          created_at: string
          footer_text: string
          id: number
          logo_url: string | null
          primary_color: string
          scoring_level_id: number | null
          signer_name: string
          signer_title: string
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          bg_image_url?: string | null
          body_text?: string
          created_at?: string
          footer_text?: string
          id?: number
          logo_url?: string | null
          primary_color?: string
          scoring_level_id?: number | null
          signer_name?: string
          signer_title?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          bg_image_url?: string | null
          body_text?: string
          created_at?: string
          footer_text?: string
          id?: number
          logo_url?: string | null
          primary_color?: string
          scoring_level_id?: number | null
          signer_name?: string
          signer_title?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_scoring_level_id_fkey"
            columns: ["scoring_level_id"]
            isOneToOne: true
            referencedRelation: "scoring_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_files: {
        Row: {
          created_at: string
          evaluation_id: string
          file_name: string
          file_path: string
          file_url: string
          id: string
          indicator_id: string
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          file_name: string
          file_path: string
          file_url: string
          id?: string
          indicator_id: string
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          file_name?: string
          file_path?: string
          file_url?: string
          id?: string
          indicator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_files_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          indicator_id: string
          score: number
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          indicator_id: string
          score?: number
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          indicator_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          total_max: number
          total_score: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          total_max?: number
          total_score?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          total_max?: number
          total_score?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      indicators: {
        Row: {
          created_at: string
          description: string | null
          detail: string | null
          evidence_description: string | null
          id: string
          max_score: number
          name: string
          notes: string | null
          scoring_criteria: Json | null
          sort_order: number
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          detail?: string | null
          evidence_description?: string | null
          id: string
          max_score?: number
          name: string
          notes?: string | null
          scoring_criteria?: Json | null
          sort_order?: number
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          detail?: string | null
          evidence_description?: string | null
          id?: string
          max_score?: number
          name?: string
          notes?: string | null
          scoring_criteria?: Json | null
          sort_order?: number
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          organization: string
          position: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          organization?: string
          position?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          organization?: string
          position?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          about: Json
          created_at: string
          description: string
          guidelines: Json
          icon: string
          id: string
          name: string
          reports: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          about?: Json
          created_at?: string
          description?: string
          guidelines?: Json
          icon?: string
          id: string
          name: string
          reports?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          about?: Json
          created_at?: string
          description?: string
          guidelines?: Json
          icon?: string
          id?: string
          name?: string
          reports?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      scoring_levels: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: number
          max_score: number
          min_score: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: number
          max_score?: number
          min_score?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: number
          max_score?: number
          min_score?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          category_id: number
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: number
          created_at?: string
          id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
