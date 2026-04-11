'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Lead {
  id: string; name: string; email: string; phone: string
  website: string; source: string; score: number
  category: 'hot'|'cold'; keyword: string; status: string; created_at: string
}

const SOURCE_COLORS: any = {
  facebook:  '#1877f2',
  instagram: '#e1306c',
  justdial:  '#e8790a',
  indiamart: '#00a651',
  google:    '#6b7a99',
}

const SOURCE_EMOJI: any = {
  facebook: '📘', instagram: '📸', justdial: '📞', indiamart: '🏭', google: '🔍',
}

export default function LeadsPage() {
  const [leads,   setLeads]   = useState<Lead[]>([])
  const [filter,  setFilter]  = useState<'all'|'hot'|'cold'>('all')
  const [source,  setSource]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string|null>(null)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [msg,     setMsg]     = useState('')

  useEffect(() => { fetchLeads() }, [filter, source])

  async function fetchLeads() {
    setLoading(true)
    setMsg('')
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('category', filter)
    if (source !== 'all') params.set('source', source)
    const res  = await fetch(`/api/leads?${params}&limit=500`)
    const data = await res.json()
    if (!res.ok) {
      setLeads([])
      setMsg(`❌ ${data.error || 'Could not load leads'}`)
    } else {
      setLeads(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  async function sendEmail(lead: Lead, step = 1) {
    setSending(lead.id)
    setMsg('')
    try {
      const res  = await fetch('/api/followup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lead_id: lead.id, step }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg(`✅ Email sent to ${data.email}`)
      fetchLeads()
    } catch (e: any) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setSending(null)
    }
  }

  async function deleteLead(lead: Lead) {
    const label = lead.name || lead.email || lead.phone || 'this lead'
    if (!confirm(`Delete ${label}?`)) return
    setDeleting(lead.id)
    setMsg('')
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setMsg('✅ Lead removed')
      fetchLeads()
    } catch (e: any) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const filtered = leads.filter(l =>
    !search || [l.name, l.email, l.keyword, l.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/" style={{ color: 'var(--muted)', fontSize: '.8rem', textDecoration: 'none' }}>← Dashboard</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>All Leads</h1>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {/* Hot/Cold filter */}
          {(['all','hot','cold'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '.35rem .9rem', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', background: filter === f ? 'rgba(108,99,255,.2)' : 'transparent', color: filter === f ? '#a09bff' : 'var(--muted)', border: `1px solid ${filter === f ? '#a09bff' : 'var(--border)'}` }}>
              {f}
            </button>
          ))}
          {/* Source filter */}
          <select value={source} onChange={e => setSource(e.target.value)} style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '.35rem .75rem', fontSize: '.72rem', outline: 'none' }}>
            <option value="all">All Sources</option>
            <option value="facebook">📘 Facebook</option>
            <option value="instagram">📸 Instagram</option>
            <option value="justdial">📞 Justdial</option>
            <option value="indiamart">🏭 Indiamart</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search name, email, phone, keyword..."
        style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '.6rem 1rem', fontSize: '.85rem', marginBottom: '1rem', outline: 'none' }}
      />

      {msg && (
        <div style={{ marginBottom: '1rem', padding: '.6rem 1rem', background: msg.startsWith('✅') ? 'rgba(0,217,160,.1)' : 'rgba(255,107,107,.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(0,217,160,.3)' : 'rgba(255,107,107,.3)'}`, borderRadius: 8, fontSize: '.82rem' }}>{msg}</div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.76rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Source','Name','Email','Phone','Website','Keyword','Score','Category','Status','Actions'].map(h => (
                <th key={h} style={{ padding: '.6rem .9rem', textAlign: 'left', color: 'var(--muted)', textTransform: 'uppercase', fontSize: '.6rem', letterSpacing: '1.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Loading leads...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No leads found. Run a scrape first.</td></tr>
            ) : filtered.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid rgba(30,35,50,.5)' }}>
                <td style={{ padding: '.5rem .9rem' }}>
                  <span style={{ background: `${SOURCE_COLORS[lead.source] || '#6b7a99'}22`, color: SOURCE_COLORS[lead.source] || '#6b7a99', padding: '2px 8px', borderRadius: 20, fontSize: '.62rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {SOURCE_EMOJI[lead.source] || '🔍'} {lead.source}
                  </span>
                </td>
                <td style={{ padding: '.5rem .9rem', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name || '—'}</td>
                <td style={{ padding: '.5rem .9rem', color: '#a09bff', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email || '—'}</td>
                <td style={{ padding: '.5rem .9rem', whiteSpace: 'nowrap' }}>{lead.phone || '—'}</td>
                <td style={{ padding: '.5rem .9rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>🔗 link</a> : '—'}
                </td>
                <td style={{ padding: '.5rem .9rem', color: 'var(--muted)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.keyword}</td>
                <td style={{ padding: '.5rem .9rem', fontWeight: 700, color: lead.score >= 60 ? 'var(--green)' : 'var(--amber)' }}>{lead.score}</td>
                <td style={{ padding: '.5rem .9rem' }}>
                  <span style={{ background: lead.category === 'hot' ? 'rgba(0,217,160,.15)' : 'rgba(107,122,153,.15)', color: lead.category === 'hot' ? 'var(--green)' : 'var(--muted)', padding: '2px 8px', borderRadius: 20, fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {lead.category}
                  </span>
                </td>
                <td style={{ padding: '.5rem .9rem' }}>
                  <span style={{ background: 'rgba(240,165,0,.1)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 20, fontSize: '.62rem' }}>{lead.status}</span>
                </td>
                <td style={{ padding: '.5rem .9rem' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {lead.email && (
                      <button
                        type="button"
                        onClick={() => sendEmail(lead, lead.status === 'contacted' ? 2 : 1)}
                        disabled={sending === lead.id}
                        style={{ background: lead.status === 'new' ? 'var(--accent)' : 'var(--bg3)', color: lead.status === 'new' ? '#fff' : 'var(--muted)', border: `1px solid ${lead.status === 'new' ? 'var(--accent)' : 'var(--border)'}`, padding: '3px 10px', borderRadius: 6, fontSize: '.65rem', cursor: sending === lead.id ? 'wait' : 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
                      >
                        {sending === lead.id ? '...' : lead.status === 'new' ? 'Send' : 'Follow-up'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteLead(lead)}
                      disabled={deleting === lead.id}
                      style={{ background: 'transparent', color: 'var(--red)', border: '1px solid rgba(255,107,107,.4)', padding: '3px 10px', borderRadius: 6, fontSize: '.65rem', cursor: deleting === lead.id ? 'wait' : 'pointer', fontWeight: 700 }}
                    >
                      {deleting === lead.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '.75rem', color: 'var(--muted)', fontSize: '.72rem' }}>
        Showing {filtered.length} of {leads.length} leads
      </div>
    </div>
  )
}
