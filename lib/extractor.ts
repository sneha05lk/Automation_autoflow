// lib/extractor.ts

const EMAIL_BLACKLIST = ['noreply','no-reply','example','test@','admin@google','privacy@','support@google']

export interface Lead {
  name:    string | null
  email:   string | null
  phone:   string | null
  website: string | null
  source:  string
  keyword: string
  snippet: string | null
}

// Safe regex exec loop — works in all TS targets
function extractAll(text: string, pattern: string, flags: string): string[] {
  const re      = new RegExp(pattern, flags)
  const results: string[] = []
  let match
  while ((match = re.exec(text)) !== null) {
    results.push(match[0])
  }
  return results
}

export function extractFields(
  snippet: string,
  sourceUrl: string,
  title: string,
  keyword: string
): Lead | null {
  const text = ((title || '') + ' ' + (snippet || '')).replace(/\s+/g, ' ')

  // Extract emails
  const emails = extractAll(text, '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', 'g')
    .map(e => e.toLowerCase())
    .filter(e => !EMAIL_BLACKLIST.some(b => e.includes(b)))

  // Extract Indian + international phone numbers
  const phones = extractAll(text, '(\\+?\\d[\\d\\s\\-\\.]{8,}\\d)', 'g')
    .map(p => p.trim())
    .filter(p => p.replace(/\D/g, '').length >= 10)

  // Extract websites
  const websites = extractAll(text, 'https?:\\/\\/(www\\.)?[a-zA-Z0-9\\-]+\\.[a-zA-Z]{2,6}(\\/[^\\s]*)?', 'g')
    .filter(u => !u.includes('google.') && !u.includes('gstatic') && !u.includes('facebook.com/ads'))

  // ── Accept any result that has a title and a URL
  // Leads without email/phone score lower, but are still worth capturing
  const hasTitle = (title || '').trim().length > 3
  const hasUrl   = sourceUrl && sourceUrl.startsWith('http')
  if (!hasTitle && !hasUrl) return null

  // Use the source URL as a unique "phone" placeholder if no contact info found
  // so the lead still passes the deduplication logic in scraper.ts
  const uniqueId = emails[0] || phones[0] || sourceUrl

  if (!uniqueId) return null

  const nameParts = (title || '').match(/([A-Z][a-z]+ ?){2,4}/)
  const name      = nameParts ? nameParts[0].trim() : (title || '').slice(0, 60) || null

  return {
    name,
    email:   emails[0]   || null,
    phone:   phones[0]   || null,
    website: websites[0] || (sourceUrl?.startsWith('http') ? sourceUrl : null),
    source:  detectSource(sourceUrl || ''),
    keyword,
    snippet: (snippet || '').slice(0, 300) || null,
  }
}

export function detectSource(url: string): string {
  if (!url) return 'google'
  if (url.includes('facebook.com'))  return 'facebook'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('justdial.com'))  return 'justdial'
  if (url.includes('indiamart.com')) return 'indiamart'
  return 'google'
}
