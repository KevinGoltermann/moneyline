import { supabase, supabaseAdmin, executeQuery } from './supabase'
import { 
  Pick, 
  PickInsert, 
  Result, 
  ResultInsert, 
  PerformanceStats, 
  PerformanceHistory,
  PickWithResult 
} from './database.types'
import { validatePickInsert, isValidDate, isValidUUID } from './validation'
import { getTodayDate, createErrorResponse } from './utils'

// Pick operations
export async function getTodaysPick(date?: string) {
  const pickDate = date || getTodayDate()
  
  if (!isValidDate(pickDate)) {
    return { data: null, error: 'Invalid date format' }
  }

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .eq('pick_date', pickDate)
      .maybeSingle()
    
    return { data: data as PickWithResult | null, error }
  })
}

export async function createPick(pick: PickInsert) {
  // Validate the pick data
  const validation = validatePickInsert(pick)
  if (!validation.success) {
    return { 
      data: null, 
      error: `Validation failed: ${validation.error.issues.map((e: any) => e.message).join(', ')}` 
    }
  }

  // Check if pick already exists for this date
  const existingPick = await checkPickExists(pick.pick_date)
  if (existingPick.data) {
    return { data: null, error: 'Pick already exists for this date' }
  }

  return executeQuery(async () => {
    return await supabaseAdmin
      .from('picks')
      .insert(pick)
      .select()
      .single()
  })
}

export async function getPickById(id: string) {
  if (!isValidUUID(id)) {
    return { data: null, error: 'Invalid pick ID format' }
  }

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .eq('id', id)
      .single()
    
    return { data: data as PickWithResult | null, error }
  })
}

// Result operations
export async function settlePickResult(pickId: string, result: 'win' | 'loss' | 'push', notes?: string) {
  if (!isValidUUID(pickId)) {
    return { data: null, error: 'Invalid pick ID format' }
  }

  // Check if pick exists
  const pick = await getPickById(pickId)
  if (!pick.data) {
    return { data: null, error: 'Pick not found' }
  }

  // Check if result already exists
  if (pick.data.result) {
    return { data: null, error: 'Pick result already settled' }
  }

  return executeQuery(async () => {
    const resultData: ResultInsert = {
      pick_id: pickId,
      result,
      notes: notes || null
    }
    
    return await supabaseAdmin
      .from('results')
      .insert(resultData)
      .select()
      .single()
  })
}

export async function updatePickResult(pickId: string, result: 'win' | 'loss' | 'push', notes?: string) {
  return executeQuery(async () => {
    return await supabaseAdmin
      .from('results')
      .update({ result, notes: notes || null })
      .eq('pick_id', pickId)
      .select()
      .single()
  })
}

// Performance operations
export async function getPerformanceStats() {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('v_performance')
      .select('*')
      .maybeSingle()
    
    // If no data exists, return default stats matching the view structure
    if (!data && !error) {
      return {
        data: {
          total_picks: 0,
          wins: 0,
          losses: 0,
          pushes: 0,
          settled_picks: 0,
          win_rate: 0,
          current_streak: null
        } as PerformanceStats,
        error: null
      }
    }
    
    return { data, error }
  })
}

export async function getPerformanceHistory(limit?: number, offset?: number) {
  return executeQuery(async () => {
    let query = supabase
      .from('mv_performance_history')
      .select('*')
      .order('pick_date', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1)
    }
    
    return await query
  })
}

export async function getPicksWithResults(limit?: number, offset?: number) {
  return executeQuery(async () => {
    let query = supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .order('pick_date', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1)
    }
    
    return await query
  })
}

// Utility functions
export async function refreshPerformanceHistory() {
  return executeQuery(async () => {
    return await supabaseAdmin.rpc('refresh_performance_history')
  })
}

export async function checkPickExists(date: string) {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select('id')
      .eq('pick_date', date)
      .maybeSingle()
    
    return { data: !!data, error }
  })
}

// Admin operations
export async function deletePick(id: string) {
  return executeQuery(async () => {
    return await supabaseAdmin
      .from('picks')
      .delete()
      .eq('id', id)
  })
}

export async function getAllUnsettledPicks() {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .is('results.result', null)
      .order('pick_date', { ascending: false })
    
    return { data: data as PickWithResult[] | null, error }
  })
}

// Additional utility functions for better error handling and data validation
export async function getPicksInDateRange(startDate: string, endDate: string) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return { data: null, error: 'Invalid date format' }
  }

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .gte('pick_date', startDate)
      .lte('pick_date', endDate)
      .order('pick_date', { ascending: false })
    
    return { data: data as PickWithResult[] | null, error }
  })
}

export async function getRecentPicks(limit: number = 10) {
  if (limit < 1 || limit > 100) {
    return { data: null, error: 'Limit must be between 1 and 100' }
  }

  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .order('pick_date', { ascending: false })
      .limit(limit)
    
    return { data: data as PickWithResult[] | null, error }
  })
}

export async function getPicksByLeague(league: string, limit?: number) {
  if (!league || league.trim().length === 0) {
    return { data: null, error: 'League is required' }
  }

  return executeQuery(async () => {
    let query = supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .eq('league', league)
      .order('pick_date', { ascending: false })
    
    if (limit && limit > 0) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    return { data: data as PickWithResult[] | null, error }
  })
}

export async function updatePick(id: string, updates: Partial<PickInsert>) {
  if (!isValidUUID(id)) {
    return { data: null, error: 'Invalid pick ID format' }
  }

  // Validate updates if they contain critical fields
  if (updates.pick_date && !isValidDate(updates.pick_date)) {
    return { data: null, error: 'Invalid date format' }
  }

  return executeQuery(async () => {
    return await supabaseAdmin
      .from('picks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  })
}

// Additional utility functions for better API support
export async function getPicksCount(): Promise<{ data: number | null; error: string | null }> {
  return executeQuery(async () => {
    const { count, error } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })
    
    return { data: count, error }
  })
}

export async function getSettledPicksCount(): Promise<{ data: number | null; error: string | null }> {
  return executeQuery(async () => {
    const { count, error } = await supabase
      .from('picks')
      .select('*, results!inner(*)', { count: 'exact', head: true })
    
    return { data: count, error }
  })
}

export async function getPicksByDateRange(startDate: string, endDate: string, limit?: number, offset?: number) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return { data: null, error: 'Invalid date format' }
  }

  return executeQuery(async () => {
    let query = supabase
      .from('picks')
      .select(`
        *,
        results!fk_results_pick_id (*)
      `)
      .gte('pick_date', startDate)
      .lte('pick_date', endDate)
      .order('pick_date', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1)
    }
    
    const { data, error } = await query
    return { data: data as PickWithResult[] | null, error }
  })
}

export async function getWinningStreak(): Promise<{ data: number | null; error: string | null }> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        pick_date,
        results!fk_results_pick_id (result)
      `)
      .not('results.result', 'is', null)
      .order('pick_date', { ascending: false })
      .limit(50) // Get last 50 picks to calculate streak
    
    if (error || !data) {
      return { data: null, error }
    }

    let streak = 0
    for (const pick of data) {
      const result = (pick as any).results?.result
      if (result === 'win') {
        streak++
      } else {
        break
      }
    }
    
    return { data: streak, error: null }
  })
}

export async function getLosingStreak(): Promise<{ data: number | null; error: string | null }> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        pick_date,
        results!fk_results_pick_id (result)
      `)
      .not('results.result', 'is', null)
      .order('pick_date', { ascending: false })
      .limit(50) // Get last 50 picks to calculate streak
    
    if (error || !data) {
      return { data: null, error }
    }

    let streak = 0
    for (const pick of data) {
      const result = (pick as any).results?.result
      if (result === 'loss') {
        streak++
      } else {
        break
      }
    }
    
    return { data: streak, error: null }
  })
}

// Health check utilities
export async function getDatabaseHealth(): Promise<{ data: any; error: string | null }> {
  return executeQuery(async () => {
    const [picksCount, resultsCount, performanceStats] = await Promise.all([
      supabase.from('picks').select('*', { count: 'exact', head: true }),
      supabase.from('results').select('*', { count: 'exact', head: true }),
      supabase.from('v_performance').select('*').single()
    ])
    
    return {
      data: {
        picks_count: picksCount.count,
        results_count: resultsCount.count,
        performance_stats: performanceStats.data,
        last_updated: new Date().toISOString()
      },
      error: null
    }
  })
}