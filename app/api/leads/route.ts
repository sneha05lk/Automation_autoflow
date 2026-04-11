// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function notConfigured() {
  return NextResponse.json(
    {
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local.',
    },
    { status: 503 }
  )
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) return notConfigured()

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const source   = searchParams.get('source')
  const keyword  = searchParams.get('keyword')
  const limit    = parseInt(searchParams.get('limit') || '200')

  let query = supabaseAdmin
    .from('leads')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit)

  if (category) query = query.eq('category', category)
  if (source)   query = query.eq('source', source)
  if (keyword)  query = query.ilike('keyword', `%${keyword}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured) return notConfigured()

  const { id, status } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured) return notConfigured()

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON body required' }, { status: 400 })
  }
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
