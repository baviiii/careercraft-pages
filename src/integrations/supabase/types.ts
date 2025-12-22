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
      ai_recommendations: {
        Row: {
          ai_reasoning: string | null
          career_path_id: string | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          description: string | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          priority: number | null
          recommendation_type: string
          resource_id: string | null
          skill_id: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          career_path_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: number | null
          recommendation_type: string
          resource_id?: string | null
          skill_id?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          career_path_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: number | null
          recommendation_type?: string
          resource_id?: string | null
          skill_id?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "learning_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      career_paths: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          messages: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          updated_at?: string | null
          user_id?: string | null
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
      interview_answers: {
        Row: {
          answer_text: string
          answered_at: string
          best_answer: string | null
          clarity_score: number | null
          confidence_score: number | null
          correct_points: string[] | null
          depth_score: number | null
          id: string
          improvement_tips: string[] | null
          missing_points: string[] | null
          overall_score: number | null
          question_id: string | null
          question_text: string
          question_type: string | null
          red_flags: string[] | null
          relevance_score: number | null
          session_id: string
          skill_tags_tested: string[] | null
          structure_score: number | null
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          answer_text: string
          answered_at?: string
          best_answer?: string | null
          clarity_score?: number | null
          confidence_score?: number | null
          correct_points?: string[] | null
          depth_score?: number | null
          id?: string
          improvement_tips?: string[] | null
          missing_points?: string[] | null
          overall_score?: number | null
          question_id?: string | null
          question_text: string
          question_type?: string | null
          red_flags?: string[] | null
          relevance_score?: number | null
          session_id: string
          skill_tags_tested?: string[] | null
          structure_score?: number | null
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          answer_text?: string
          answered_at?: string
          best_answer?: string | null
          clarity_score?: number | null
          confidence_score?: number | null
          correct_points?: string[] | null
          depth_score?: number | null
          id?: string
          improvement_tips?: string[] | null
          missing_points?: string[] | null
          overall_score?: number | null
          question_id?: string | null
          question_text?: string
          question_type?: string | null
          red_flags?: string[] | null
          relevance_score?: number | null
          session_id?: string
          skill_tags_tested?: string[] | null
          structure_score?: number | null
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          avg_score: number | null
          career_path_id: string | null
          created_at: string
          difficulty: string
          expected_topics: string[] | null
          id: string
          ideal_answer_points: string[] | null
          is_ai_generated: boolean | null
          question_text: string
          question_type: string
          role_id: string | null
          skill_tags: string[] | null
          time_limit_seconds: number | null
          usage_count: number | null
        }
        Insert: {
          avg_score?: number | null
          career_path_id?: string | null
          created_at?: string
          difficulty?: string
          expected_topics?: string[] | null
          id?: string
          ideal_answer_points?: string[] | null
          is_ai_generated?: boolean | null
          question_text: string
          question_type: string
          role_id?: string | null
          skill_tags?: string[] | null
          time_limit_seconds?: number | null
          usage_count?: number | null
        }
        Update: {
          avg_score?: number | null
          career_path_id?: string | null
          created_at?: string
          difficulty?: string
          expected_topics?: string[] | null
          id?: string
          ideal_answer_points?: string[] | null
          is_ai_generated?: boolean | null
          question_text?: string
          question_type?: string
          role_id?: string | null
          skill_tags?: string[] | null
          time_limit_seconds?: number | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "interview_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_roles: {
        Row: {
          career_path_id: string | null
          common_titles: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          seniority_levels: string[] | null
        }
        Insert: {
          career_path_id?: string | null
          common_titles?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          seniority_levels?: string[] | null
        }
        Update: {
          career_path_id?: string | null
          common_titles?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          seniority_levels?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_roles_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          ai_insights: Json | null
          answers: Json | null
          avg_score: number | null
          career_path_id: string | null
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          field: string
          final_evaluation: Json | null
          id: string
          job_description: string | null
          question_count: number | null
          questions: Json | null
          role_id: string | null
          scores: Json | null
          seniority: string | null
          skill_breakdown: Json | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          answers?: Json | null
          avg_score?: number | null
          career_path_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          field: string
          final_evaluation?: Json | null
          id?: string
          job_description?: string | null
          question_count?: number | null
          questions?: Json | null
          role_id?: string | null
          scores?: Json | null
          seniority?: string | null
          skill_breakdown?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights?: Json | null
          answers?: Json | null
          avg_score?: number | null
          career_path_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          field?: string
          final_evaluation?: Json | null
          id?: string
          job_description?: string | null
          question_count?: number | null
          questions?: Json | null
          role_id?: string | null
          scores?: Json | null
          seniority?: string | null
          skill_breakdown?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "interview_roles"
            referencedColumns: ["id"]
          },
        ]
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
      learning_resources: {
        Row: {
          career_paths: string[] | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          provider: string | null
          rating: number | null
          resource_type: string
          skill_tags: string[] | null
          thumbnail_url: string | null
          times_completed: number | null
          times_recommended: number | null
          title: string
          url: string | null
        }
        Insert: {
          career_paths?: string[] | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          provider?: string | null
          rating?: number | null
          resource_type: string
          skill_tags?: string[] | null
          thumbnail_url?: string | null
          times_completed?: number | null
          times_recommended?: number | null
          title: string
          url?: string | null
        }
        Update: {
          career_paths?: string[] | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          provider?: string | null
          rating?: number | null
          resource_type?: string
          skill_tags?: string[] | null
          thumbnail_url?: string | null
          times_completed?: number | null
          times_recommended?: number | null
          title?: string
          url?: string | null
        }
        Relationships: []
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
      milestones: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          category: string | null
          description: string | null
          external_id: string
          fetched_at: string | null
          id: string
          image_url: string | null
          keywords: string[] | null
          published_at: string
          read_time: string | null
          source: string | null
          title: string
          url: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          external_id: string
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          published_at: string
          read_time?: string | null
          source?: string | null
          title: string
          url: string
        }
        Update: {
          category?: string | null
          description?: string | null
          external_id?: string
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          published_at?: string
          read_time?: string | null
          source?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          career_level: string | null
          created_at: string
          current_company: string | null
          current_job_title: string | null
          desired_salary_currency: string | null
          desired_salary_max: number | null
          desired_salary_min: number | null
          employment_status: string | null
          full_name: string | null
          headline: string | null
          id: string
          industry: string | null
          job_change_timeline: string | null
          location_city: string | null
          location_country: string | null
          onboarding_completed: boolean | null
          phone: string | null
          preferred_locations: string[] | null
          profile_completed_at: string | null
          target_companies: string[] | null
          target_job_titles: string[] | null
          timezone: string | null
          updated_at: string
          work_arrangement: string[] | null
          years_of_experience: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          career_level?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          desired_salary_currency?: string | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          employment_status?: string | null
          full_name?: string | null
          headline?: string | null
          id: string
          industry?: string | null
          job_change_timeline?: string | null
          location_city?: string | null
          location_country?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_locations?: string[] | null
          profile_completed_at?: string | null
          target_companies?: string[] | null
          target_job_titles?: string[] | null
          timezone?: string | null
          updated_at?: string
          work_arrangement?: string[] | null
          years_of_experience?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          career_level?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          desired_salary_currency?: string | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          employment_status?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          job_change_timeline?: string | null
          location_city?: string | null
          location_country?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_locations?: string[] | null
          profile_completed_at?: string | null
          target_companies?: string[] | null
          target_job_titles?: string[] | null
          timezone?: string | null
          updated_at?: string
          work_arrangement?: string[] | null
          years_of_experience?: string | null
        }
        Relationships: []
      }
      rag_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          query: string
          rating: number | null
          response: string
          session_id: string | null
          sources: Json | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          query: string
          rating?: number | null
          response: string
          session_id?: string | null
          sources?: Json | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          query?: string
          rating?: number | null
          response?: string
          session_id?: string | null
          sources?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      score_history: {
        Row: {
          behavioral_score: number | null
          career_path_id: string | null
          communication_score: number | null
          id: string
          overall_score: number
          problem_solving_score: number | null
          question_count: number | null
          recorded_at: string
          role_id: string | null
          seniority: string | null
          session_duration_seconds: number | null
          session_id: string | null
          technical_score: number | null
          user_id: string
        }
        Insert: {
          behavioral_score?: number | null
          career_path_id?: string | null
          communication_score?: number | null
          id?: string
          overall_score: number
          problem_solving_score?: number | null
          question_count?: number | null
          recorded_at?: string
          role_id?: string | null
          seniority?: string | null
          session_duration_seconds?: number | null
          session_id?: string | null
          technical_score?: number | null
          user_id: string
        }
        Update: {
          behavioral_score?: number | null
          career_path_id?: string | null
          communication_score?: number | null
          id?: string
          overall_score?: number
          problem_solving_score?: number | null
          question_count?: number | null
          recorded_at?: string
          role_id?: string | null
          seniority?: string | null
          session_duration_seconds?: number | null
          session_id?: string | null
          technical_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_history_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "interview_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_tags: {
        Row: {
          career_paths: string[] | null
          category: string
          created_at: string
          description: string | null
          difficulty_weight: number | null
          id: string
          name: string
        }
        Insert: {
          career_paths?: string[] | null
          category: string
          created_at?: string
          description?: string | null
          difficulty_weight?: number | null
          id?: string
          name: string
        }
        Update: {
          career_paths?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          difficulty_weight?: number | null
          id?: string
          name?: string
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
      user_certifications: {
        Row: {
          created_at: string | null
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_milestones: {
        Row: {
          achieved_at: string
          id: string
          milestone_id: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          id?: string
          milestone_id?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          id?: string
          milestone_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_patterns: {
        Row: {
          avg_answer_length: number | null
          avg_session_duration_seconds: number | null
          clarity_trend: string | null
          current_streak_days: number | null
          id: string
          improvement_rate_weekly: number | null
          last_practice_date: string | null
          longest_streak_days: number | null
          overall_trend: string | null
          preferred_practice_time: string | null
          sessions_per_week: number | null
          strongest_question_type: string | null
          strongest_skills: string[] | null
          total_practice_time_seconds: number | null
          total_questions_answered: number | null
          total_sessions: number | null
          updated_at: string
          user_id: string
          uses_star_method_percent: number | null
          weakest_question_type: string | null
          weakest_skills: string[] | null
        }
        Insert: {
          avg_answer_length?: number | null
          avg_session_duration_seconds?: number | null
          clarity_trend?: string | null
          current_streak_days?: number | null
          id?: string
          improvement_rate_weekly?: number | null
          last_practice_date?: string | null
          longest_streak_days?: number | null
          overall_trend?: string | null
          preferred_practice_time?: string | null
          sessions_per_week?: number | null
          strongest_question_type?: string | null
          strongest_skills?: string[] | null
          total_practice_time_seconds?: number | null
          total_questions_answered?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
          uses_star_method_percent?: number | null
          weakest_question_type?: string | null
          weakest_skills?: string[] | null
        }
        Update: {
          avg_answer_length?: number | null
          avg_session_duration_seconds?: number | null
          clarity_trend?: string | null
          current_streak_days?: number | null
          id?: string
          improvement_rate_weekly?: number | null
          last_practice_date?: string | null
          longest_streak_days?: number | null
          overall_trend?: string | null
          preferred_practice_time?: string | null
          sessions_per_week?: number | null
          strongest_question_type?: string | null
          strongest_skills?: string[] | null
          total_practice_time_seconds?: number | null
          total_questions_answered?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
          uses_star_method_percent?: number | null
          weakest_question_type?: string | null
          weakest_skills?: string[] | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          alert_types: string[] | null
          created_at: string
          display_settings: Json | null
          email_notifications: boolean | null
          id: string
          interview_preferences: Json | null
          interview_types: string[] | null
          job_preferences: Json | null
          job_role_type: string | null
          news_preferences: Json | null
          notification_settings: Json | null
          preferred_countries: string[] | null
          preferred_field: string | null
          preferred_industries: string[] | null
          privacy_settings: Json | null
          push_notifications: boolean | null
          seniority_level: string | null
          summary_frequency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_types?: string[] | null
          created_at?: string
          display_settings?: Json | null
          email_notifications?: boolean | null
          id?: string
          interview_preferences?: Json | null
          interview_types?: string[] | null
          job_preferences?: Json | null
          job_role_type?: string | null
          news_preferences?: Json | null
          notification_settings?: Json | null
          preferred_countries?: string[] | null
          preferred_field?: string | null
          preferred_industries?: string[] | null
          privacy_settings?: Json | null
          push_notifications?: boolean | null
          seniority_level?: string | null
          summary_frequency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_types?: string[] | null
          created_at?: string
          display_settings?: Json | null
          email_notifications?: boolean | null
          id?: string
          interview_preferences?: Json | null
          interview_types?: string[] | null
          job_preferences?: Json | null
          job_role_type?: string | null
          news_preferences?: Json | null
          notification_settings?: Json | null
          preferred_countries?: string[] | null
          preferred_field?: string | null
          preferred_industries?: string[] | null
          privacy_settings?: Json | null
          push_notifications?: boolean | null
          seniority_level?: string | null
          summary_frequency?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_resources: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          progress_percent: number | null
          resource_id: string | null
          started_at: string | null
          status: string | null
          user_id: string
          user_rating: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          progress_percent?: number | null
          resource_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id: string
          user_rating?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          progress_percent?: number | null
          resource_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "learning_resources"
            referencedColumns: ["id"]
          },
        ]
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
      user_skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          last_tested_at: string | null
          proficiency: string | null
          proficiency_level: number | null
          skill_id: string | null
          times_correct: number | null
          times_tested: number | null
          trend: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          last_tested_at?: string | null
          proficiency?: string | null
          proficiency_level?: number | null
          skill_id?: string | null
          times_correct?: number | null
          times_tested?: number | null
          trend?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          last_tested_at?: string | null
          proficiency?: string | null
          proficiency_level?: number | null
          skill_id?: string | null
          times_correct?: number | null
          times_tested?: number | null
          trend?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_insights: {
        Row: {
          avg_score: number | null
          created_at: string
          encouragement: string | null
          focus_area: string | null
          id: string
          next_week_goals: string[] | null
          practice_time_seconds: number | null
          questions_answered: number | null
          score_change: number | null
          sessions_completed: number | null
          skills_declined: string[] | null
          skills_improved: string[] | null
          summary: string | null
          top_improvement: string | null
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          avg_score?: number | null
          created_at?: string
          encouragement?: string | null
          focus_area?: string | null
          id?: string
          next_week_goals?: string[] | null
          practice_time_seconds?: number | null
          questions_answered?: number | null
          score_change?: number | null
          sessions_completed?: number | null
          skills_declined?: string[] | null
          skills_improved?: string[] | null
          summary?: string | null
          top_improvement?: string | null
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          avg_score?: number | null
          created_at?: string
          encouragement?: string | null
          focus_area?: string | null
          id?: string
          next_week_goals?: string[] | null
          practice_time_seconds?: number | null
          questions_answered?: number | null
          score_change?: number | null
          sessions_completed?: number | null
          skills_declined?: string[] | null
          skills_improved?: string[] | null
          summary?: string | null
          top_improvement?: string | null
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_profile_completeness: {
        Args: { p_user_id: string }
        Returns: number
      }
      clean_old_news_articles: { Args: never; Returns: undefined }
      get_user_profile_complete: { Args: { p_user_id: string }; Returns: Json }
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
