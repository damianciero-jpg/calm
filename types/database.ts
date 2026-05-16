export type Role = 'parent' | 'therapist' | 'admin'
export type Mood = 'happy' | 'calm' | 'anxious' | 'angry' | 'sad' | 'tired'
export type GameMode = 'kids' | 'teen'
export type NotificationType = 'alert' | 'pattern' | 'positive'

export interface Profile {
  id: string
  email: string | null
  fullName: string | null
  role: Role | string | null
  createdAt?: unknown
}

export interface Child {
  id: string
  parentId: string
  parent_id?: string
  name: string
  age: number | null
  avatar: string | null
  color: string | null
  gameMode: GameMode | string | null
  game_mode?: GameMode | string | null
  createdAt?: unknown
}

export interface Session {
  id: string
  childId: string
  parentId?: string
  mood: Mood | string
  stars: number
  game: string | null
  world: string | null
  dayLabel: string | null
  playedAt: unknown
  createdAt?: unknown
}

export interface Notification {
  id: string
  recipientId: string
  childId: string | null
  type: NotificationType | string
  title: string
  body: string | null
  read: boolean
  createdAt?: unknown
}

export interface IepGoal {
  id: string
  childId: string
  label: string
  score: number | null
  maxScore: number | null
  createdAt?: unknown
}

export interface TherapistNote {
  id: string
  childId: string
  therapistId: string | null
  content: string | null
  createdAt?: unknown
}
