// lib/scorer.ts
import { Lead } from './extractor'

export interface ScoredLead extends Lead {
  score:            number
  category:         'hot' | 'cold'
  score_reasons:    string[]
  /** Digits-only phone for DB dedupe when email is missing */
  phone_normalized: string | null
}

function normalizePhoneDigits(phone: string | null): string | null {
  if (!phone) return null
  const d = phone.replace(/\D/g, '')
  return d.length >= 10 ? d : null
}

export function scoreLead(lead: Lead): ScoredLead {
  let score = 0
  const reasons: string[] = []
  const phone_normalized = normalizePhoneDigits(lead.phone)

  if (lead.email) {
    score += 30; reasons.push('has email')
  }
  if (lead.email && !/^(info|contact|hello|admin|support)@/.test(lead.email)) {
    score += 10; reasons.push('personal email')
  }
  if (lead.phone) {
    score += 25; reasons.push('has phone')
  }
  if (lead.website) {
    score += 10; reasons.push('has website')
  }
  if (lead.name && lead.name.trim().split(' ').length >= 2) {
    score += 15; reasons.push('full name')
  }
  if (['justdial','indiamart'].includes(lead.source)) {
    score += 10; reasons.push(`trusted source: ${lead.source}`)
  }

  return {
    ...lead,
    phone_normalized,
    score,
    category:      score >= 60 ? 'hot' : 'cold',
    score_reasons: reasons,
  }
}
