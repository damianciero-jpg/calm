// Auto-generate accurate types after applying the Supabase schema:
//   npx supabase gen types typescript --project-id <project-id> > types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Role = 'parent' | 'therapist' | 'admin'
export type Mood = 'happy' | 'calm' | 'anxious' | 'angry' | 'sad' | 'tired'
export type GameMode = 'kids' | 'teen'
export type NotificationType = 'alert' | 'pattern' | 'positive'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: Role | string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: Role | string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          role?: Role | string | null
          updated_at?: string | null
        }
      }
      children: {
        Row: {
          id: string
          parent_id: string
          name: string
          age: number | null
          avatar: string | null
          color: string | null
          game_mode: GameMode | string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          parent_id: string
          name: string
          age?: number | null
          avatar?: string | null
          color?: string | null
          game_mode?: GameMode | string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          parent_id?: string
          name?: string
          age?: number | null
          avatar?: string | null
          color?: string | null
          game_mode?: GameMode | string | null
          updated_at?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          child_id: string
          mood: Mood | string
          stars: number
          game: string | null
          world: string | null
          day_label: string | null
          played_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          mood: Mood | string
          stars?: number
          game?: string | null
          world?: string | null
          day_label?: string | null
          played_at?: string | null
          created_at?: string | null
        }
        Update: {
          child_id?: string
          mood?: Mood | string
          stars?: number
          game?: string | null
          world?: string | null
          day_label?: string | null
          played_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string | null
          child_id: string | null
          type: NotificationType | string
          title: string
          body: string | null
          read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          recipient_id?: string | null
          child_id?: string | null
          type?: NotificationType | string
          title: string
          body?: string | null
          read?: boolean | null
          created_at?: string | null
        }
        Update: {
          recipient_id?: string | null
          child_id?: string | null
          type?: NotificationType | string
          title?: string
          body?: string | null
          read?: boolean | null
        }
      }
      iep_goals: {
        Row: {
          id: string
          child_id: string
          label: string
          score: number | null
          max_score: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          label: string
          score?: number | null
          max_score?: number | null
          created_at?: string | null
        }
        Update: {
          child_id?: string
          label?: string
          score?: number | null
          max_score?: number | null
        }
      }
      therapist_notes: {
        Row: {
          id: string
          child_id: string
          therapist_id: string | null
          content: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          therapist_id?: string | null
          content?: string | null
          created_at?: string | null
        }
        Update: {
          child_id?: string
          therapist_id?: string | null
          content?: string | null
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Child = Database['public']['Tables']['children']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type IepGoal = Database['public']['Tables']['iep_goals']['Row']
export type TherapistNote = Database['public']['Tables']['therapist_notes']['Row']
