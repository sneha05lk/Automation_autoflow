// app/api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runScraper }      from '@/lib/scraper'
import { isSupabaseConfigured } from '@/lib/supabase'
import { upsertScrapedLeads } from '@/lib/persist-leads'

export const maxDuration = 60 // 60 second timeout

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      {
        error:
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local (see .env.example).',
      },
      { status: 503 }
    )
  }

  // Check for Serper API Key early
  const serper = process.env.SERPER_API_KEY?.trim()
  if (!serper || serper === 'your_serper_key_here') {
    return NextResponse.json({ 
      error: 'SERPER_API_KEY is missing. Please add it to your .env.local file to enable scraping.' 
    }, { status: 500 })
  }

  try {
    const body    = await req.json()
    const keyword = (body.keyword || '').trim()
    const sources = body.sources || ['facebook', 'instagram', 'justdial', 'indiamart']

    if (!keyword) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 })
    }

    console.log(`[API/scrape] keyword="${keyword}" sources=${sources.join(',')}`)

    const { leads, serperErrors } = await runScraper(keyword, sources)

    if (leads.length === 0) {
      const serperHint =
        serperErrors.length > 0
          ? ` Serper reported: ${serperErrors.join(' ')}`
          : ''
      return NextResponse.json({
        total: 0,
        hot: 0,
        cold: 0,
        keyword,
        serperErrors,
        message:
          (serperErrors.length
            ? 'No leads saved.'
            : 'No leads found. Results may be empty or contact info could not be extracted.') +
          serperHint,
      })
    }

    const { data, error } = await upsertScrapedLeads(leads)

    if (error) {
      console.error('[API/scrape] DB error:', error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    const hot  = (data || []).filter((l: any) => l.category === 'hot').length
    const cold = (data || []).filter((l: any) => l.category === 'cold').length

    return NextResponse.json({ total: (data || []).length, hot, cold, keyword })
  } catch (err: any) {
    console.error('[API/scrape] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
