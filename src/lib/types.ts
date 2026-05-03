export type EntryKind = 'POSZT' | 'VIDEÓ' | 'ÁTVITEL' | 'RIASZTÁS' | 'MEZŐNAPLÓ' | 'MEMÓRIADIFF' | 'ADÁS'
export type PostKind = 'SZÖVEG' | 'KÉP' | 'VIDEÓ'

export interface Operator {
  id: string
  auth_id: string | null
  callsign: string
  level: number
  role: 'operator' | 'admin' | 'superadmin'
  node: string
  joined_cycle: number
  bio: string | null
  avatar_url?: string | null
  xp?: number
  last_seen?: string | null
  chat_color?: string | null
  interests?: string[]
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  text: string | null
  image_url?: string | null
  read: boolean
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted'

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  accepted_at: string | null
}

export interface Entry {
  id: string
  title: string
  kind: EntryKind
  content: string
  excerpt: string | null
  operator_id: string
  cycle: number
  sigs: string[]
  priority: boolean
  alert: boolean
  reads: number
  created_at: string
  operator?: Operator
  media_url?: string | null
  media_type?: 'youtube' | 'image' | 'audio' | null
  media_label?: string | null
  reactions?: Record<string, number>
  initialComments?: Signal[]
  commentCount?: number
  status?: 'draft' | 'published'
}

export interface EntryReaction {
  entry_id: string
  operator_id: string
  emoji: string
  created_at: string
}

export interface Signal {
  id: string
  entry_id: string | null
  operator_id: string
  parent_id: string | null
  text: string | null
  image_url?: string | null
  sigs: string[]
  verified: boolean
  created_at: string
  operator?: Operator
  children?: Signal[]
  reactions?: Record<string, number>
}

export interface Thread {
  id: string
  title: string
  created_at: string
  entries?: Entry[]
}

export interface ProfileSignal {
  id: string
  target_id: string
  author_id: string
  text: string | null
  image_url?: string | null
  verified: boolean
  pinned?: boolean
  created_at: string
  author?: Operator
  reactions?: Record<string, number>
}

export type Database = {
  public: {
    Tables: {
      operators:       { Row: Operator;      Insert: Omit<Operator,'created_at'>;               Update: Partial<Omit<Operator,'id'>>;      Relationships: [] }
      entries:         { Row: Entry;         Insert: Omit<Entry,'id'|'created_at'|'reads'>;      Update: Partial<Omit<Entry,'id'>>;         Relationships: [] }
      signals:         { Row: Signal;        Insert: Omit<Signal,'id'|'created_at'>;             Update: Partial<Omit<Signal,'id'>>;        Relationships: [] }
      threads:         { Row: Thread;        Insert: Omit<Thread,'id'|'created_at'>;             Update: Partial<Omit<Thread,'id'>>;        Relationships: [] }
      thread_entries:  { Row: { thread_id: string; entry_id: string }; Insert: { thread_id: string; entry_id: string }; Update: { thread_id?: string; entry_id?: string }; Relationships: [] }
      profile_signals: { Row: ProfileSignal; Insert: Omit<ProfileSignal,'id'|'created_at'>;      Update: Partial<Omit<ProfileSignal,'id'>>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
