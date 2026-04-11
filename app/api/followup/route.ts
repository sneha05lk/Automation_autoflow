// app/api/followup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { sendLeadEmail, sendBulkEmails } from '@/lib/mailer'

export const dynamic = 'force-dynamic'
/** Bulk path sends up to 20 leads with ~2.5s delay each */
export const maxDuration = 120

function notConfigured() {
  return NextResponse.json(
    {
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local.',
    },
    { status: 503 }
  )
}

// POST — send to ONE lead
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return notConfigured()

  try {
    const { lead_id, step } = await req.json()

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
    }

    // Fetch lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    if (!lead.email) {
      return NextResponse.json({ error: 'This lead has no email address' }, { status: 400 })
    }

    // Send email
    const result = await sendLeadEmail({
      to:      lead.email,
      name:    lead.name    || 'there',
      keyword: lead.keyword || 'your industry',
      source:  lead.source  || 'google',
      step:    step || 1,
    })

    // Update lead status
    await supabaseAdmin
      .from('leads')
      .update({ status: 'contacted' })
      .eq('id', lead_id)

    // Log in followups table
    await supabaseAdmin.from('followups').insert({
      lead_id,
      step:    step || 1,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, email: lead.email, id: result.id })
  } catch (err: any) {
    console.error('[followup POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — send to ALL hot leads not yet contacted
export async function GET() {
  if (!isSupabaseConfigured) return notConfigured()

  try {
    const { data: hotLeads, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('category', 'hot')
      .eq('status', 'new')
      .not('email', 'is', null)
      .limit(20)

    if (error) throw error

    if (!hotLeads || hotLeads.length === 0) {
      return NextResponse.json({ message: 'No new hot leads to contact', processed: 0 })
    }

    const results = await sendBulkEmails(
      hotLeads.map((l: any) => ({
        id: l.id,
        email: l.email,
        name: l.name,
        keyword: l.keyword,
        source: l.source,
      })),
      1
    )

    for (const r of results) {
      if (r.status !== 'sent') continue
      await supabaseAdmin.from('leads').update({ status: 'contacted' }).eq('id', r.id)
      await supabaseAdmin.from('followups').insert({
        lead_id: r.id,
        step: 1,
        sent_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      processed: results.length,
      sent:      results.filter(r => r.status === 'sent').length,
      failed:    results.filter(r => r.status === 'failed').length,
      results,
    })
  } catch (err: any) {
    console.error('[followup GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
