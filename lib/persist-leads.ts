// lib/persist-leads.ts — map scored leads to DB rows and upsert in batches
import { supabaseAdmin } from './supabase'
import type { ScoredLead } from './scorer'

export function toDbRow(l: ScoredLead) {
  return {
    keyword: l.keyword,
    name: l.name,
    email: l.email,
    phone: l.phone,
    phone_normalized: l.phone_normalized ?? null,
    website: l.website,
    source: l.source,
    score: l.score,
    category: l.category,
    score_reasons: l.score_reasons,
    snippet: l.snippet,
  }
}

type DbRow = ReturnType<typeof toDbRow>

export async function upsertScrapedLeads(leads: ScoredLead[]): Promise<{
  data: DbRow[]
  error: Error | null
}> {
  const rows = leads.map(toDbRow)
  const withEmail = rows.filter((r) => r.email)
  const phoneOnly = rows.filter((r) => !r.email && r.phone_normalized)
  const leftover = rows.filter((r) => !r.email && !r.phone_normalized)

  const merged: DbRow[] = []

  if (withEmail.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .upsert(withEmail, { onConflict: 'email', ignoreDuplicates: true })
      .select()

    if (error) return { data: [], error: new Error(error.message) }
    merged.push(...((data || []) as DbRow[]))
  }

  if (phoneOnly.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .upsert(phoneOnly, { onConflict: 'phone_normalized', ignoreDuplicates: true })
      .select()

    if (error) return { data: merged, error: new Error(error.message) }
    merged.push(...((data || []) as DbRow[]))
  }

  if (leftover.length > 0) {
    const { data, error } = await supabaseAdmin.from('leads').insert(leftover).select()
    if (error) return { data: merged, error: new Error(error.message) }
    merged.push(...((data || []) as DbRow[]))
  }

  return { data: merged, error: null }
}
