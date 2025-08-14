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
      picks: {
        Row: {
          id: string
          pick_date: string
          league: string
          home_team: string
          away_team: string
          market: string
          selection: string
          odds: number
          confidence: number
          rationale: Json
          features_used: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pick_date: string
          league: string
          home_team: string
          away_team: string
          market?: string
          selection: string
          odds: number
          confidence: number
          rationale: Json
          features_used?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pick_date?: string
          league?: string
          home_team?: string
          away_team?: string
          market?: string
          selection?: string
          odds?: number
          confidence?: number
          rationale?: Json
          features_used?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          id: string
          pick_id: string
          result: 'win' | 'loss' | 'push'
          settled_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          pick_id: string
          result: 'win' | 'loss' | 'push'
          settled_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          pick_id?: string
          result?: 'win' | 'loss' | 'push'
          settled_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_results_pick_id"
            columns: ["pick_id"]
            isOneToOne: true
            referencedRelation: "picks"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      v_performance: {
        Row: {
          total_picks: number | null
          wins: number | null
          losses: number | null
          pushes: number | null
          settled_picks: number | null
          win_rate: number | null
          current_streak: Json | null
        }
        Relationships: []
      }
      mv_performance_history: {
        Row: {
          pick_date: string | null
          league: string | null
          selection: string | null
          odds: number | null
          confidence: number | null
          result: 'win' | 'loss' | 'push' | null
          settled_at: string | null
          cumulative_wins: number | null
          cumulative_losses: number | null
          cumulative_pushes: number | null
          running_win_rate: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_performance_history: {
        Args: {}
        Returns: undefined
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

// Convenience types for application use
export type Pick = Database['public']['Tables']['picks']['Row']
export type PickInsert = Database['public']['Tables']['picks']['Insert']
export type PickUpdate = Database['public']['Tables']['picks']['Update']

export type Result = Database['public']['Tables']['results']['Row']
export type ResultInsert = Database['public']['Tables']['results']['Insert']
export type ResultUpdate = Database['public']['Tables']['results']['Update']

export type PerformanceStats = Database['public']['Views']['v_performance']['Row']
export type PerformanceHistory = Database['public']['Views']['mv_performance_history']['Row']

// Application-specific types
export interface PickRationale {
  topFactors: string[]
  reasoning: string
  confidence_factors?: {
    odds_movement?: number
    team_form?: number
    weather_impact?: number
    injury_impact?: number
    home_advantage?: number
  }
}

export interface PickWithResult extends Pick {
  result?: Result | null
}

export interface PerformanceOverview {
  winRate: number
  record: string
  totalPicks: number
  currentStreak: {
    type: 'win' | 'loss' | 'none'
    count: number
  }
}

export interface ChartDataPoint {
  date: string
  winRate: number
  cumulativeWins: number
  cumulativeLosses: number
}