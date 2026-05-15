// Auto-generate accurate types after Phase 2 schema is applied:
//   npx supabase gen types typescript --project-id pvxhlvsoshtbcwpgfixs > types/database.ts
// (requires: npx supabase login  OR  SUPABASE_ACCESS_TOKEN env var)

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Role = 'parent' | 'therapist' | 'admin'
export type Mood = 'happy' | 'calm' | 'anxious' | 'angry' | 'sad' | 'tired'
export type NotificationType = 'alert' | 'pattern' | 'positive'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Role
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          role: Role
          full_name?: string
          created_at?: string
        }
        Update: {
          role?: Role
          full_name?: string
        }
      }
      children: {
        Row: {
          id: string
          parent_id: string
          name: string
          age: number
          avatar: string
          color: string
          therapist_id: string | null
          created_at: string
          game_mode: 'kids' | 'teen' | null
        }
        Insert: {
          id?: string
          parent_id: string
          name: string
          age: number
          avatar?: string
          color?: string
          therapist_id?: string | null
          created_at?: string
          game_mode?: 'kids' | 'teen'
        }
        Update: {
          name?: string
          age?: number
          avatar?: string
          color?: string
          therapist_id?: string | null
          game_mode?: 'kids' | 'teen'
        }
      }
      sessions: {
        Row: {
          id: string
          child_id: string
          mood: Mood
          stars: 1 | 2 | 3
          game: string
          world: string
          played_at: string
          day_label: string
        }
        Insert: {
          id?: string
          child_id: string
          mood: Mood
          stars: 1 | 2 | 3
          game: string
          world?: string
          played_at?: string
          day_label?: string
        }
        Update: {
          mood?: Mood
          stars?: 1 | 2 | 3
          game?: string
          world?: string
        }
      }
      therapist_notes: {
        Row: {
          id: string
          child_id: string
          therapist_id: string
          content: string
          ai_summary: Json | null
          week_of: string
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          therapist_id: string
          content?: string
          ai_summary?: Json | null
          week_of: string
          created_at?: string
        }
        Update: {
          content?: string
          ai_summary?: Json | null
        }
      }
      iep_goals: {
        Row: {
          id: string
          child_id: string
          label: string
          score: number
          max_score: number
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          label: string
          score: number
          max_score?: number
          updated_at?: string
        }
        Update: {
          label?: string
          score?: number
          max_score?: number
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          child_id: string
          type: NotificationType
          title: string
          body: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          child_id: string
          type: NotificationType
          title: string
          body?: string
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
    }
  }
}

// Convenience row types
export type Profile       = Database['public']['Tables']['profiles']['Row']
export type Child         = Database['public']['Tables']['children']['Row']
export type Session       = Database['public']['Tables']['sessions']['Row']
export type TherapistNote = Database['public']['Tables']['therapist_notes']['Row']
export type IepGoal       = Database['public']['Tables']['iep_goals']['Row']
export type Notification  = Database['public']['Tables']['notifications']['Row']
