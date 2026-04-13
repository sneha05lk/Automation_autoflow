// lib/scraper.ts
// Scrapes: Facebook · Instagram · Justdial · Indiamart (via Serper → Google)
import https from 'node:https'
import { extractFields, Lead } from './extractor'
import { scoreLead, ScoredLead } from './scorer'

export interface ScraperResult {
  leads: ScoredLead[]
  /** Messages from Serper when requests fail (e.g. "Query not allowed") */
  serperErrors: string[]
}

type SerperOpts = { linkIncludes?: string }

// ── SERPER FETCH HELPER ───────────────────────────────────────────────────────
async function searchSerper(
  serpQuery: string,
  keyword: string,
  num = 20,
  opts?: SerperOpts
): Promise<{ leads: Lead[]; apiError?: string }> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey || apiKey === 'your_serper_key_here') {
    console.warn('[SERPER] API key missing or invalid.')
    return { leads: [], apiError: 'SERPER_API_KEY missing or placeholder' }
  }

  const payload: Record<string, unknown> = { q: serpQuery, num }
  const gl = process.env.SERPER_GL?.trim()
  const hl = process.env.SERPER_HL?.trim()
  if (gl) payload.gl = gl
  if (hl) payload.hl = hl

  const body = JSON.stringify(payload)
  console.log(`[SERPER DBG] query: ${serpQuery}`)

  return new Promise((resolve) => {
    const options = {
      hostname: 'google.serper.dev',
      path: '/search',
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          let msg = data
          try {
            const parsed = JSON.parse(data) as { message?: string }
            if (parsed.message) msg = parsed.message
          } catch { /* raw body */ }
          console.error(`[SERPER] Error: ${res.statusCode}`, data)
          return resolve({ leads: [], apiError: msg })
        }
        try {
          const parsed = JSON.parse(data) as { organic?: Array<{ snippet?: string; link?: string; title?: string }> }
          const results: Lead[] = []
          const needle = opts?.linkIncludes?.toLowerCase()
          if (parsed.organic && Array.isArray(parsed.organic)) {
            for (const item of parsed.organic) {
              const link = (item.link || '').toLowerCase()
              if (needle && !link.includes(needle)) continue
              const extracted = extractFields(item.snippet, item.link, item.title, keyword)
              if (extracted) results.push(extracted)
            }
          }
          console.log(`[SERPER] Got ${results.length} extracted leads`)
          resolve({ leads: results })
        } catch (e: any) {
          console.error('[SERPER] Parse error:', e.message)
          resolve({ leads: [], apiError: e.message })
        }
      })
    })

    req.on('error', (e) => {
      console.error('[SERPER] Request error:', e.message)
      resolve({ leads: [], apiError: e.message })
    })

    req.write(body)
    req.end()
  })
}

// ── SOURCE SPECIFIC WRAPPERS ──────────────────────────────────────────────────
// Use plain keywords + URL filtering instead of `site:` — Serper often returns
// 400 "Query not allowed" for site:-restricted domains on some keys/plans.

async function scrapeFromFacebook(keyword: string): Promise<{ leads: Lead[]; apiError?: string }> {
  console.log('[FACEBOOK] Scraping via Serper...')
  const q = `${keyword} facebook`
  const { leads, apiError } = await searchSerper(q, keyword, 40, { linkIncludes: 'facebook.com' })
  leads.forEach((r) => { r.source = 'facebook' })
  return { leads, apiError }
}

async function scrapeFromInstagram(keyword: string): Promise<{ leads: Lead[]; apiError?: string }> {
  console.log('[INSTAGRAM] Scraping via Serper...')
  const q = `${keyword} instagram`
  const { leads, apiError } = await searchSerper(q, keyword, 40, { linkIncludes: 'instagram.com' })
  leads.forEach((r) => { r.source = 'instagram' })
  return { leads, apiError }
}

async function scrapeFromJustdial(keyword: string): Promise<{ leads: Lead[]; apiError?: string }> {
  console.log('[JUSTDIAL] Scraping via Serper...')
  const q = `${keyword} justdial`
  const { leads, apiError } = await searchSerper(q, keyword, 40, { linkIncludes: 'justdial.com' })
  leads.forEach((r) => { r.source = 'justdial' })
  return { leads, apiError }
}

async function scrapeFromIndiamart(keyword: string): Promise<{ leads: Lead[]; apiError?: string }> {
  console.log('[INDIAMART] Scraping via Serper...')
  const q = `${keyword} indiamart`
  const { leads, apiError } = await searchSerper(q, keyword, 40, { linkIncludes: 'indiamart.com' })
  leads.forEach((r) => { r.source = 'indiamart' })
  return { leads, apiError }
}

// ── MAIN SCRAPER ─────────────────────────────────────────────────────────────

export async function runScraper(
  keyword: string,
  sources: string[] = ['facebook', 'instagram', 'justdial', 'indiamart']
): Promise<ScraperResult> {
  console.log(`\n[SCRAPER] === Starting: "${keyword}" ===`)

  const tasks = sources.map((source) => {
    switch (source) {
      case 'facebook':  return scrapeFromFacebook(keyword)
      case 'instagram': return scrapeFromInstagram(keyword)
      case 'justdial':  return scrapeFromJustdial(keyword)
      case 'indiamart': return scrapeFromIndiamart(keyword)
      default:          return Promise.resolve({ leads: [] as Lead[] })
    }
  })

  const slices = await Promise.all(tasks)
  const serperErrors = [...new Set(slices.map((s) => s.apiError).filter(Boolean) as string[])]
  const all = slices.flatMap((s) => s.leads)

  console.log(`[SCRAPER] Total raw results: ${all.length}`)
  if (serperErrors.length) {
    console.warn('[SCRAPER] Serper errors:', serperErrors.join(' | '))
  }

  const seenEmail   = new Set<string>()
  const seenPhone   = new Set<string>()
  const seenWebsite = new Set<string>()

  const unique = all.filter((lead) => {
    if (lead.email) {
      const email = lead.email.toLowerCase()
      if (seenEmail.has(email)) return false
      seenEmail.add(email)
      return true
    }
    if (lead.phone) {
      const cleaned = lead.phone.replace(/\D/g, '')
      if (cleaned.length >= 10) {
        if (seenPhone.has(cleaned)) return false
        seenPhone.add(cleaned)
        return true
      }
    }
    if (lead.website) {
      const url = lead.website.toLowerCase().replace(/\/$/, '')
      if (seenWebsite.has(url)) return false
      seenWebsite.add(url)
      return true
    }
    return false
  })

  console.log(`[SCRAPER] After deduplication: ${unique.length}`)
  console.log(`[SCRAPER] === Done ===\n`)

  return {
    leads: unique.map(scoreLead),
    serperErrors,
  }
}
