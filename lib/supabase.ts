// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY?.trim()

const placeholderMarkers = new Set([
  '',
  'your-project-url',
  'your-anon-key',
  'your-service-role-key',
  'placeholder',
])

function isReal(value: string | undefined): boolean {
  return Boolean(value && !placeholderMarkers.has(value))
}

/** True when URL + service role key are set (required for server APIs) */
export const isSupabaseConfigured =
  isReal(supabaseUrl) && isReal(supabaseServiceKey)

// Use dummy values if env vars are missing to allow build to complete
const finalUrl = isReal(supabaseUrl) ? supabaseUrl! : 'https://placeholder.supabase.co'
const finalAnonKey = isReal(supabaseAnonKey) ? supabaseAnonKey! : 'placeholder'
const finalServiceKey = isReal(supabaseServiceKey) ? supabaseServiceKey! : 'placeholder'

export const supabaseAdmin = createClient(finalUrl, finalServiceKey)
export const supabase = createClient(finalUrl, finalAnonKey)
