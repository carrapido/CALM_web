// Generated from the CALM project with the Supabase CLI or MCP `generate_typescript_types`.
// Regenerate after every migration instead of editing by hand.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      admins: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      appointment_services: {
        Row: {
          appointment_id: number
          service_id: number
        }
        Insert: {
          appointment_id: number
          service_id: number
        }
        Update: {
          appointment_id?: number
          service_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'appointment_services_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointment_services_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
        ]
      }
      appointments: {
        Row: {
          client_id: number
          id: number
          preliminary_total_mxn: number
          scheduled_date: string
          scheduled_time: string
          ticket: string
        }
        Insert: {
          client_id: number
          id?: never
          preliminary_total_mxn: number
          scheduled_date: string
          scheduled_time: string
          ticket: string
        }
        Update: {
          client_id?: number
          id?: never
          preliminary_total_mxn?: number
          scheduled_date?: string
          scheduled_time?: string
          ticket?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      blocked_dates: {
        Row: {
          blocked_by: string
          blocked_date: string
        }
        Insert: {
          blocked_by: string
          blocked_date: string
        }
        Update: {
          blocked_by?: string
          blocked_date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blocked_dates_blocked_by_fkey'
            columns: ['blocked_by']
            isOneToOne: false
            referencedRelation: 'admins'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          has_app_access: boolean | null
          id: number
          name: string
          nip_hash: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          has_app_access?: boolean | null
          id?: never
          name: string
          nip_hash?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          has_app_access?: boolean | null
          id?: never
          name?: string
          nip_hash?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          appointment_id: number | null
          client_id: number
          delivery_date: string
          final_price_mxn: number
          id: number
          status: string
          ticket: string
          work: string
        }
        Insert: {
          appointment_id?: number | null
          client_id: number
          delivery_date: string
          final_price_mxn: number
          id?: never
          status?: string
          ticket: string
          work: string
        }
        Update: {
          appointment_id?: number | null
          client_id?: number
          delivery_date?: string
          final_price_mxn?: number
          id?: never
          status?: string
          ticket?: string
          work?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: true
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      services: {
        Row: {
          base_price_mxn: number | null
          category: string
          estimated_days: number
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          base_price_mxn?: number | null
          category: string
          estimated_days: number
          id?: never
          is_active?: boolean
          name: string
        }
        Update: {
          base_price_mxn?: number | null
          category?: string
          estimated_days?: number
          id?: never
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      sign_in_attempts: {
        Row: {
          failures: number
          locked_until: string | null
          phone: string
        }
        Insert: {
          failures?: number
          locked_until?: string | null
          phone: string
        }
        Update: {
          failures?: number
          locked_until?: string | null
          phone?: string
        }
        Relationships: []
      }
      weekly_schedule: {
        Row: {
          closes_at: string | null
          opens_at: string | null
          updated_by: string
          weekday: string
        }
        Insert: {
          closes_at?: string | null
          opens_at?: string | null
          updated_by: string
          weekday: string
        }
        Update: {
          closes_at?: string | null
          opens_at?: string | null
          updated_by?: string
          weekday?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weekly_schedule_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'admins'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      booking_calendar: { Args: never; Returns: Json }
      cancel_my_appointment: { Args: { p_ticket: string }; Returns: undefined }
      claim_nip_attempt: { Args: { p_phone: string }; Returns: boolean }
      mark_on_my_way: { Args: { p_ticket: string }; Returns: undefined }
      orphaned_auth_user_id: {
        Args: { p_client_id: number; p_email: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
