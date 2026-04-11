// lib/scraper.ts
// Scrapes: Facebook · Instagram · Justdial · Indiamart
import https from 'node:https'
import { extractFields, Lead } from './extractor'
import { scoreLead, ScoredLead } from './scorer'


// ── SERPER FETCH HELPER ───────────────────────────────────────────────────────
async function searchSerper(query: string, num = 20): Promise<Lead[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey || apiKey === 'your_serper_key_here') {
    console.warn('[SERPER] API key missing or invalid.')
    return []
  }

  return new Promise((resolve) => {
    const body = JSON.stringify({ q: query, num })
    console.log(`[SERPER DBG] query: ${query}`)

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
          console.error(`[SERPER] Error: ${res.statusCode}`, data)
          return resolve([])
        }
        try {
          const parsed = JSON.parse(data)
          const results: Lead[] = []
          if (parsed.organic && Array.isArray(parsed.organic)) {
            for (const item of parsed.organic) {
              const extracted = extractFields(item.snippet, item.link, item.title, query)
              if (extracted) results.push(extracted)
            }
          }
          console.log(`[SERPER] Got ${results.length} extracted leads`)
          resolve(results)
        } catch (e: any) {
          console.error('[SERPER] Parse error:', e.message)
          resolve([])
        }
      })
    })

    req.on('error', (e) => {
      console.error('[SERPER] Request error:', e.message)
      resolve([])
    })

    req.write(body)
    req.end()
  })
}


// ── SOURCE SPECIFIC WRAPPERS ──────────────────────────────────────────────────

async function scrapeFromFacebook(keyword: string): Promise<Lead[]> {
  console.log('[FACEBOOK] Scraping via Serper...')
  const query = `site:facebook.com "${keyword}" contact`
  const results = await searchSerper(query, 30)
  results.forEach(r => { r.source = 'facebook' })
  return results
}

async function scrapeFromInstagram(keyword: string): Promise<Lead[]> {
  console.log('[INSTAGRAM] Scraping via Serper...')
  const query = `"${keyword}" site:instagram.com`
  const results = await searchSerper(query, 30)
  results.forEach(r => { r.source = 'instagram' })
  return results
}

async function scrapeFromJustdial(keyword: string): Promise<Lead[]> {
  console.log('[JUSTDIAL] Scraping via Serper...')
  const query = `site:justdial.com ${keyword}`
  const results = await searchSerper(query, 30)
  results.forEach(r => { r.source = 'justdial' })
  return results
}

async function scrapeFromIndiamart(keyword: string): Promise<Lead[]> {
  console.log('[INDIAMART] Scraping via Serper...')
  const query = `site:indiamart.com ${keyword}`
  const results = await searchSerper(query, 30)
  results.forEach(r => { r.source = 'indiamart' })
  return results
}

// ── MAIN SCRAPER ─────────────────────────────────────────────────────────────

export async function runScraper(
  keyword: string,
  sources: string[] = ['facebook', 'instagram', 'justdial', 'indiamart']
): Promise<ScoredLead[]> {
  console.log(`\n[SCRAPER] ═══ Starting: "${keyword}" ═══`)
  
  // Run all selected sources in parallel for speed
  const tasks = sources.map(source => {
    switch (source) {
      case 'facebook':  return scrapeFromFacebook(keyword)
      case 'instagram': return scrapeFromInstagram(keyword)
      case 'justdial':  return scrapeFromJustdial(keyword)
      case 'indiamart': return scrapeFromIndiamart(keyword)
      default:          return Promise.resolve([])
    }
  })

  const resultsArray = await Promise.all(tasks)
  const all = resultsArray.flat()

  console.log(`[SCRAPER] Total raw results: ${all.length}`)

  // Deduplicate by email, then phone, then website URL
  const seenEmail   = new Set<string>()
  const seenPhone   = new Set<string>()
  const seenWebsite = new Set<string>()

  const unique = all.filter(lead => {
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
    // Fallback: deduplicate by website URL
    if (lead.website) {
      const url = lead.website.toLowerCase().replace(/\/$/, '')
      if (seenWebsite.has(url)) return false
      seenWebsite.add(url)
      return true
    }
    return false
  })

  console.log(`[SCRAPER] After deduplication: ${unique.length}`)
  console.log(`[SCRAPER] ═══ Done ═══\n`)

  return unique.map(scoreLead)
}
