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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          content: string
          created_at: string
          entity_id: string | null
          entity_type: string
          expires_at: string | null
          id: string
          insight_type: string
          severity: string | null
          target_roles: string[]
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          expires_at?: string | null
          id?: string
          insight_type: string
          severity?: string | null
          target_roles?: string[]
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          severity?: string | null
          target_roles?: string[]
          title?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          performed_by: string | null
          performed_by_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          performed_by?: string | null
          performed_by_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          performed_by?: string | null
          performed_by_role?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          code: string
          created_at: string
          external_id: string | null
          id: string
          location: string | null
          name: string
          region_id: string
        }
        Insert: {
          code: string
          created_at?: string
          external_id?: string | null
          id?: string
          location?: string | null
          name: string
          region_id: string
        }
        Update: {
          code?: string
          created_at?: string
          external_id?: string | null
          id?: string
          location?: string | null
          name?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_photos: {
        Row: {
          client_user_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          loan_id: string | null
          notes: string | null
          photo_type: string
          uploaded_by: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          loan_id?: string | null
          notes?: string | null
          photo_type: string
          uploaded_by: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          loan_id?: string | null
          notes?: string | null
          photo_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_photos_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          body: string
          branch_id: string | null
          created_at: string
          id: string
          is_read: boolean
          parent_id: string | null
          priority: string
          recipient_id: string | null
          recipient_role: string | null
          region_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          branch_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          parent_id?: string | null
          priority?: string
          recipient_id?: string | null
          recipient_role?: string | null
          region_id?: string | null
          sender_id: string
          subject: string
        }
        Update: {
          body?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          parent_id?: string | null
          priority?: string
          recipient_id?: string | null
          recipient_role?: string | null
          region_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "internal_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          interview_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interview_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interview_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_recordings_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interview_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_schedules: {
        Row: {
          application_id: string
          created_at: string
          duration_minutes: number
          id: string
          interview_type: string
          interviewer_user_id: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          status: string
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          interview_type?: string
          interviewer_user_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          interview_type?: string
          interviewer_user_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_national_id: string | null
          applicant_phone: string
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          resume_file_path: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_national_id?: string | null
          applicant_phone: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          resume_file_path?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_national_id?: string | null
          applicant_phone?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          resume_file_path?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          description: string
          employment_type: string
          id: string
          location: string
          requirements: string
          salary_range: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          description: string
          employment_type?: string
          id?: string
          location?: string
          requirements: string
          salary_range?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          employment_type?: string
          id?: string
          location?: string
          requirements?: string
          salary_range?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          loan_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          loan_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          loan_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_applications: {
        Row: {
          ai_recommendation: string | null
          amount_approved: number | null
          approval_level: string | null
          approval_notes: string | null
          approved_by: string | null
          branch_id: string | null
          business_description: string | null
          business_type: string
          created_at: string
          disbursed_by: string | null
          disbursement_date: string | null
          disbursement_method: string | null
          disbursement_reference: string | null
          email: string | null
          expected_completion_date: string | null
          external_id: string | null
          financing_amount: string | null
          full_name: string
          id: string
          loan_officer_id: string | null
          location: string | null
          national_id: string | null
          phone: string
          product_id: string | null
          risk_score: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          amount_approved?: number | null
          approval_level?: string | null
          approval_notes?: string | null
          approved_by?: string | null
          branch_id?: string | null
          business_description?: string | null
          business_type: string
          created_at?: string
          disbursed_by?: string | null
          disbursement_date?: string | null
          disbursement_method?: string | null
          disbursement_reference?: string | null
          email?: string | null
          expected_completion_date?: string | null
          external_id?: string | null
          financing_amount?: string | null
          full_name: string
          id?: string
          loan_officer_id?: string | null
          location?: string | null
          national_id?: string | null
          phone: string
          product_id?: string | null
          risk_score?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          amount_approved?: number | null
          approval_level?: string | null
          approval_notes?: string | null
          approved_by?: string | null
          branch_id?: string | null
          business_description?: string | null
          business_type?: string
          created_at?: string
          disbursed_by?: string | null
          disbursement_date?: string | null
          disbursement_method?: string | null
          disbursement_reference?: string | null
          email?: string | null
          expected_completion_date?: string | null
          external_id?: string | null
          financing_amount?: string | null
          full_name?: string
          id?: string
          loan_officer_id?: string | null
          location?: string | null
          national_id?: string | null
          phone?: string
          product_id?: string | null
          risk_score?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "loan_products"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_products: {
        Row: {
          code: string
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          interest_rate: number
          is_active: boolean | null
          max_amount: number
          min_amount: number
          name: string
          processing_fee_percent: number | null
          term_weeks: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          interest_rate: number
          is_active?: boolean | null
          max_amount?: number
          min_amount?: number
          name: string
          processing_fee_percent?: number | null
          term_weeks: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          interest_rate?: number
          is_active?: boolean | null
          max_amount?: number
          min_amount?: number
          name?: string
          processing_fee_percent?: number | null
          term_weeks?: number
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string
          due_date: string
          id: string
          loan_id: string
          paid_date: string | null
          status: string
          week_number: number
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string
          due_date: string
          id?: string
          loan_id: string
          paid_date?: string | null
          status?: string
          week_number: number
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string
          due_date?: string
          id?: string
          loan_id?: string
          paid_date?: string | null
          status?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_description: string | null
          business_type: string | null
          created_at: string
          email: string | null
          external_id: string | null
          financing_amount: string | null
          full_name: string | null
          id: string
          location: string | null
          national_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_description?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          financing_amount?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          national_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_description?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          financing_amount?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          national_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      sms_automation_rules: {
        Row: {
          action_campaign_type: string
          action_template: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          target_hierarchy: string
          trigger_condition: string
          trigger_count: number | null
          trigger_params: Json | null
          updated_at: string
        }
        Insert: {
          action_campaign_type?: string
          action_template: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          target_hierarchy?: string
          trigger_condition: string
          trigger_count?: number | null
          trigger_params?: Json | null
          updated_at?: string
        }
        Update: {
          action_campaign_type?: string
          action_template?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          target_hierarchy?: string
          trigger_condition?: string
          trigger_count?: number | null
          trigger_params?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_campaigns: {
        Row: {
          branch_id: string | null
          campaign_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recurrence: string | null
          region_id: string | null
          scheduled_at: string | null
          sms_provider: string
          status: string
          target_hierarchy: string
          template: string
          total_delivered: number | null
          total_failed: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          campaign_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recurrence?: string | null
          region_id?: string | null
          scheduled_at?: string | null
          sms_provider?: string
          status?: string
          target_hierarchy?: string
          template: string
          total_delivered?: number | null
          total_failed?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          campaign_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recurrence?: string | null
          region_id?: string | null
          scheduled_at?: string | null
          sms_provider?: string
          status?: string
          target_hierarchy?: string
          template?: string
          total_delivered?: number | null
          total_failed?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_campaigns_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          campaign_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          loan_id: string | null
          message_body: string
          provider_message_id: string | null
          recipient_name: string | null
          recipient_phone: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          loan_id?: string | null
          message_body: string
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          loan_id?: string | null
          message_body?: string
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_assignments: {
        Row: {
          assigned_at: string
          branch_id: string | null
          id: string
          region_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          branch_id?: string | null
          id?: string
          region_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          branch_id?: string | null
          id?: string
          region_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          direction: string
          entity_type: string
          error_details: Json | null
          id: string
          integration_id: string | null
          records_failed: number | null
          records_processed: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          direction: string
          entity_type: string
          error_details?: Json | null
          id?: string
          integration_id?: string | null
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          direction?: string
          entity_type?: string
          error_details?: Json | null
          id?: string
          integration_id?: string | null
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "system_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_integrations: {
        Row: {
          auth_type: string | null
          base_url: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          sync_direction: string | null
          sync_status: string | null
          system_type: string
          updated_at: string | null
        }
        Insert: {
          auth_type?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          sync_direction?: string | null
          sync_status?: string | null
          system_type: string
          updated_at?: string | null
        }
        Update: {
          auth_type?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          sync_direction?: string | null
          sync_status?: string | null
          system_type?: string
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_branch_staff_for_loan: { Args: { _loan_id: string }; Returns: boolean }
      is_executive: { Args: never; Returns: boolean }
      is_loan_officer_for: { Args: { _loan_id: string }; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_marketing_lead: { Args: never; Returns: boolean }
      is_region_staff_for_loan: { Args: { _loan_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "ceo"
        | "gm"
        | "regional_manager"
        | "branch_manager"
        | "loan_officer"
        | "marketing_lead"
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
      app_role: [
        "admin",
        "user",
        "ceo",
        "gm",
        "regional_manager",
        "branch_manager",
        "loan_officer",
        "marketing_lead",
      ],
    },
  },
} as const
