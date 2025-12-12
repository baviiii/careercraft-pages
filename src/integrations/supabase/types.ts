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
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_whitelist: {
        Row: {
          added_by: string | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          job_description: string | null
          notes: string | null
          resume_id: string | null
          tags: string[] | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          job_description?: string | null
          notes?: string | null
          resume_id?: string | null
          tags?: string[] | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          job_description?: string | null
          notes?: string | null
          resume_id?: string | null
          tags?: string[] | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          answers: Json | null
          created_at: string
          field: string
          final_evaluation: Json | null
          id: string
          job_description: string | null
          questions: Json | null
          scores: Json | null
          seniority: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          field: string
          final_evaluation?: Json | null
          id?: string
          job_description?: string | null
          questions?: Json | null
          scores?: Json | null
          seniority?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          field?: string
          final_evaluation?: Json | null
          id?: string
          job_description?: string | null
          questions?: Json | null
          scores?: Json | null
          seniority?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applied_date: string
          company: string
          cover_letter_id: string | null
          created_at: string
          id: string
          job_description: string | null
          job_title: string
          job_type: string | null
          job_url: string | null
          location: string | null
          notes: string | null
          reminder_date: string | null
          resume_id: string | null
          salary_range: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_date?: string
          company: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_description?: string | null
          job_title: string
          job_type?: string | null
          job_url?: string | null
          location?: string | null
          notes?: string | null
          reminder_date?: string | null
          resume_id?: string | null
          salary_range?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_date?: string
          company?: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_description?: string | null
          job_title?: string
          job_type?: string | null
          job_url?: string | null
          location?: string | null
          notes?: string | null
          reminder_date?: string | null
          resume_id?: string | null
          salary_range?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "cover_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          ats_score: number | null
          category: string | null
          content: string
          created_at: string
          file_type: string | null
          id: string
          job_application_id: string | null
          last_analyzed_at: string | null
          last_job_description: string | null
          name: string
          notes: string | null
          original_filename: string | null
          tags: string[] | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          category?: string | null
          content: string
          created_at?: string
          file_type?: string | null
          id?: string
          job_application_id?: string | null
          last_analyzed_at?: string | null
          last_job_description?: string | null
          name: string
          notes?: string | null
          original_filename?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ats_score?: number | null
          category?: string | null
          content?: string
          created_at?: string
          file_type?: string | null
          id?: string
          job_application_id?: string | null
          last_analyzed_at?: string | null
          last_job_description?: string | null
          name?: string
          notes?: string | null
          original_filename?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_news: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          published_at: string | null
          source: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          source?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          source?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suspicious_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          alert_types: string[] | null
          created_at: string
          email_notifications: boolean | null
          id: string
          interview_types: string[] | null
          job_role_type: string | null
          preferred_countries: string[] | null
          preferred_field: string | null
          preferred_industries: string[] | null
          push_notifications: boolean | null
          seniority_level: string | null
          summary_frequency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_types?: string[] | null
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          interview_types?: string[] | null
          job_role_type?: string | null
          preferred_countries?: string[] | null
          preferred_field?: string | null
          preferred_industries?: string[] | null
          push_notifications?: boolean | null
          seniority_level?: string | null
          summary_frequency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_types?: string[] | null
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          interview_types?: string[] | null
          job_role_type?: string | null
          preferred_countries?: string[] | null
          preferred_field?: string | null
          preferred_industries?: string[] | null
          push_notifications?: boolean | null
          seniority_level?: string | null
          summary_frequency?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_whitelisted_admin: { Args: { _user_id: string }; Returns: boolean }
      log_activity: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
          _severity?: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
