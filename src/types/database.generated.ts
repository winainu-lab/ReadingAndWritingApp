export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          affiliation: string
          footer_text: string
          id: string
          landing_kicker: string
          logo_path: string | null
          system_name: string
          updated_at: string
          updated_by: string | null
          welcome_description: string
          welcome_headline: string
        }
        Insert: {
          affiliation?: string
          footer_text?: string
          id?: string
          landing_kicker?: string
          logo_path?: string | null
          system_name?: string
          updated_at?: string
          updated_by?: string | null
          welcome_description?: string
          welcome_headline?: string
        }
        Update: {
          affiliation?: string
          footer_text?: string
          id?: string
          landing_kicker?: string
          logo_path?: string | null
          system_name?: string
          updated_at?: string
          updated_by?: string | null
          welcome_description?: string
          welcome_headline?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_session_id: string
          created_at: string
          id: string
          note: string | null
          outcome: Database["public"]["Enums"]["response_outcome"]
          response_time_ms: number | null
          test_template_item_id: string
        }
        Insert: {
          assessment_session_id: string
          created_at?: string
          id?: string
          note?: string | null
          outcome: Database["public"]["Enums"]["response_outcome"]
          response_time_ms?: number | null
          test_template_item_id: string
        }
        Update: {
          assessment_session_id?: string
          created_at?: string
          id?: string
          note?: string | null
          outcome?: Database["public"]["Enums"]["response_outcome"]
          response_time_ms?: number | null
          test_template_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_session_id_fkey"
            columns: ["assessment_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_test_template_item_id_fkey"
            columns: ["test_template_item_id"]
            isOneToOne: false
            referencedRelation: "test_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          accuracy: number
          assessor_id: string
          classroom_id: string
          completed_at: string | null
          created_at: string
          duration_seconds: number
          id: string
          school_id: string
          score: number
          started_at: string
          student_id: string
          test_template_id: string
          total_items: number
        }
        Insert: {
          accuracy?: number
          assessor_id: string
          classroom_id: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          school_id: string
          score?: number
          started_at: string
          student_id: string
          test_template_id: string
          total_items?: number
        }
        Update: {
          accuracy?: number
          assessor_id?: string
          classroom_id?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          school_id?: string
          score?: number
          started_at?: string
          student_id?: string
          test_template_id?: string
          total_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_test_template_id_fkey"
            columns: ["test_template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          academic_year: number
          archived_at: string | null
          created_at: string
          created_by: string
          grade_level: string
          id: string
          room_label: string
          school_id: string
          student_count: number
        }
        Insert: {
          academic_year: number
          archived_at?: string | null
          created_at?: string
          created_by: string
          grade_level: string
          id?: string
          room_label: string
          school_id: string
          student_count?: number
        }
        Update: {
          academic_year?: number
          archived_at?: string | null
          created_at?: string
          created_by?: string
          grade_level?: string
          id?: string
          room_label?: string
          school_id?: string
          student_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_resources: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          google_drive_url: string
          id: string
          is_locked: boolean
          is_published: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          google_drive_url: string
          id?: string
          is_locked?: boolean
          is_published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          google_drive_url?: string
          id?: string
          is_locked?: boolean
          is_published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      network_centers: {
        Row: {
          code: string
          created_at: string
          district_name: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          district_name: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          district_name?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          district: string
          dmc_code: string
          id: string
          is_active: boolean
          moe_code: string | null
          name: string
          network_center_id: string
          subdistrict: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          district: string
          dmc_code: string
          id?: string
          is_active?: boolean
          moe_code?: string | null
          name: string
          network_center_id: string
          subdistrict?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          district?: string
          dmc_code?: string
          id?: string
          is_active?: boolean
          moe_code?: string | null
          name?: string
          network_center_id?: string
          subdistrict?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_network_center_id_fkey"
            columns: ["network_center_id"]
            isOneToOne: false
            referencedRelation: "network_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          level_code: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          level_code: string
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          level_code?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      students: {
        Row: {
          classroom_id: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          student_no: number
        }
        Insert: {
          classroom_id: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          student_no: number
        }
        Update: {
          classroom_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          student_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      test_template_items: {
        Row: {
          id: string
          item_type: string
          points: number
          position: number
          prompt: string
          test_template_id: string
          word_id: string | null
        }
        Insert: {
          id?: string
          item_type?: string
          points?: number
          position: number
          prompt: string
          test_template_id: string
          word_id?: string | null
        }
        Update: {
          id?: string
          item_type?: string
          points?: number
          position?: number
          prompt?: string
          test_template_id?: string
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_template_items_test_template_id_fkey"
            columns: ["test_template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_template_items_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      test_templates: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number
          id: string
          is_published: boolean
          item_count: number
          skill_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds: number
          id?: string
          is_published?: boolean
          item_count?: number
          skill_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          is_published?: boolean
          item_count?: number
          skill_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_templates_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      word_skills: {
        Row: {
          skill_id: string
          word_id: string
        }
        Insert: {
          skill_id: string
          word_id: string
        }
        Update: {
          skill_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_skills_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      words: {
        Row: {
          consonant_class: string | null
          created_at: string
          difficulty: number
          display_text: string
          final_pattern: string | null
          id: string
          is_active: boolean
          is_meaningful: boolean
          meaning: string | null
          normalized_text: string
          orthography_status: string
          pronunciation: string | null
          source_note: string | null
          syllable_count: number
          tone_name: string | null
          vowel_pattern: string | null
        }
        Insert: {
          consonant_class?: string | null
          created_at?: string
          difficulty?: number
          display_text: string
          final_pattern?: string | null
          id?: string
          is_active?: boolean
          is_meaningful?: boolean
          meaning?: string | null
          normalized_text: string
          orthography_status?: string
          pronunciation?: string | null
          source_note?: string | null
          syllable_count?: number
          tone_name?: string | null
          vowel_pattern?: string | null
        }
        Update: {
          consonant_class?: string | null
          created_at?: string
          difficulty?: number
          display_text?: string
          final_pattern?: string | null
          id?: string
          is_active?: boolean
          is_meaningful?: boolean
          meaning?: string | null
          normalized_text?: string
          orthography_status?: string
          pronunciation?: string | null
          source_note?: string | null
          syllable_count?: number
          tone_name?: string | null
          vowel_pattern?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_profile: {
        Args: {
          p_profile_id: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_school_id: string
          p_status: Database["public"]["Enums"]["profile_status"]
        }
        Returns: undefined
      }
      archive_own_classroom: {
        Args: { p_classroom_id: string }
        Returns: undefined
      }
      archive_test_template: { Args: { p_test_id: string }; Returns: undefined }
      can_access_school: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      create_classroom_with_students: {
        Args: {
          p_academic_year: number
          p_grade_level: string
          p_room_label: string
          p_school_id: string
          p_student_count: number
        }
        Returns: string
      }
      create_test_template_from_skill: {
        Args: {
          p_description: string
          p_duration_seconds: number
          p_item_count: number
          p_skill_id: string
          p_title: string
        }
        Returns: string
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_school_id: { Args: never; Returns: string }
      get_dashboard_summary: { Args: never; Returns: Json }
      get_network_report: {
        Args: never
        Returns: {
          accuracy: number
          classroom_count: number
          district_name: string
          network_id: string
          network_name: string
          school_count: number
          session_count: number
          student_count: number
        }[]
      }
      get_public_learning_resources: {
        Args: never
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          is_locked: boolean
          public_url: string
          sort_order: number
          thumbnail_url: string
          title: string
        }[]
      }
      update_test_template_from_skill: {
        Args: {
          p_description: string
          p_duration_seconds: number
          p_is_published: boolean
          p_item_count: number
          p_skill_id: string
          p_test_id: string
          p_title: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "teacher"
      profile_status: "pending" | "approved" | "suspended"
      response_outcome: "correct" | "incorrect" | "self_corrected" | "skipped"
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
      app_role: ["admin", "supervisor", "teacher"],
      profile_status: ["pending", "approved", "suspended"],
      response_outcome: ["correct", "incorrect", "self_corrected", "skipped"],
    },
  },
} as const
