import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for browser/public operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Connection utility with error handling
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('picks').select('count').limit(1)
    if (error) throw error
    return { success: true, message: 'Connection successful' }
  } catch (error) {
    return { 
      success: false, 
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// Query utilities with consistent error handling
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await queryFn()
    if (error) {
      console.error('Database query error:', error)
      return { data: null, error: error.message || 'Database query failed' }
    }
    return { data, error: null }
  } catch (error) {
    console.error('Unexpected database error:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unexpected database error' 
    }
  }
}