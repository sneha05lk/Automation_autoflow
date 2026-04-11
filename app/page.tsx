'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const SOURCES = [
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', emoji: '📘' },
  { id: 'instagram', label: 'Instagram', color: '#e1306c', emoji: '📸' },
  { id: 'justdial',  label: 'Justdial',  color: '#e8790a', emoji: '📞' },
  { id: 'indiamart', label: 'Indiamart', color: '#00a651', emoji: '🏭' },
]

export default function Dashboard() {
  const [keyword,         setKeyword]         = useState('')
  const [selectedSources, setSelectedSources] = useState(['facebook','instagram','justdial','indiamart'])
  const [loading,         setLoading]         = useState(false)
  const [result,          setResult]          = useState<any>(null)
  const [error,           setError]           = useState('')
  const [logs,            setLogs]            = useState<string[]>([])
  const [setupError,      setSetupError]      = useState('')
  const [stats,           setStats]           = useState({ total: 0, hot: 0, cold: 0, facebook: 0, instagram: 0, justdial: 0, indiamart: 0 })

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    try {
      const res  = await fetch('/api/leads?limit=500')
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) {
        setSetupError(typeof data?.error === 'string' ? data.error : 'Could not reach the leads API.')
        return
      }
      setSetupError('')
      setStats({
        total:     data.length,
        hot:       data.filter((l: any) => l.category === 'hot').length,
        cold:      data.filter((l: any) => l.category === 'cold').length,
        facebook:  data.filter((l: any) => l.source === 'facebook').length,
        instagram: data.filter((l: any) => l.source === 'instagram').length,
        justdial:  data.filter((l: any) => l.source === 'justdial').length,
        indiamart: data.filter((l: any) => l.source === 'indiamart').length,
      })
    } catch {}
  }

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 29)])
  }

  function toggleSource(id: string) {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || selectedSources.length === 0) return

    setLoading(true)
    setError('')
    setResult(null)
    addLog(`Starting scrape: "${keyword}" on ${selectedSources.join(', ')}`)

    try {
      const res  = await fetch('/api/scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keyword: keyword.trim(), sources: selectedSources }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Scrape failed')

      setResult(data)
      addLog(`✅ Done! ${data.total} leads saved — ${data.hot} hot, ${data.cold} cold`)
      fetchStats()
    } catch (err: any) {
      setError(err.message)
      addLog(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function triggerBulkFollowup() {
    addLog('Sending emails to all hot leads...')
    try {
      const res  = await fetch('/api/followup')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Follow-up request failed')
      if (data.error) throw new Error(data.error)
      if (data.processed === 0 && data.message) {
        addLog(`ℹ️ ${data.message}`)
        return
      }
      addLog(`✅ Emails sent: ${data.sent ?? 0} success, ${data.failed ?? 0} failed`)
    } catch (err: any) {
      addLog(`❌ Email error: ${err.message}`)
    }
  }

  const card = (bg: string) => ({
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '1rem 1.2rem',
  } as React.CSSProperties)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>⚡ AutoFlow</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: 4 }}>
          Lead scraper · Facebook · Instagram · Justdial · Indiamart
        </p>
        {setupError && (
          <div style={{ marginTop: '1rem', padding: '.75rem 1rem', background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.35)', borderRadius: 8, fontSize: '.82rem', color: 'var(--red)' }}>
            <strong>Setup:</strong> {setupError} See <code style={{ fontSize: '.75rem' }}>.env.example</code> and <code style={{ fontSize: '.75rem' }}>README.md</code>.
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Leads',  value: stats.total,     color: '#a09bff' },
          { label: 'Hot Leads',    value: stats.hot,       color: 'var(--green)' },
          { label: 'Cold Leads',   value: stats.cold,      color: 'var(--muted)' },
          { label: 'This Session', value: result?.total || 0, color: 'var(--amber)' },
        ].map(s => (
          <div key={s.label} style={card('')}>
            <div style={{ fontSize: '.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.75rem', marginBottom: '1.5rem' }}>
        {SOURCES.map(s => (
          <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '.75rem 1rem' }}>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
              {s.emoji} {s.label}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>
              {(stats as any)[s.id] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Scraper form */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Search & Scrape</h2>

        {/* Source selector */}
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {SOURCES.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: selectedSources.includes(s.id) ? `${s.color}22` : 'var(--bg3)', border: `1px solid ${selectedSources.includes(s.id) ? s.color : 'var(--border2)'}`, borderRadius: 8, padding: '6px 14px', fontSize: '.8rem', fontWeight: 600, transition: 'all .2s' }}>
              <input
                type="checkbox"
                checked={selectedSources.includes(s.id)}
                onChange={() => toggleSource(s.id)}
                style={{ display: 'none' }}
              />
              <span>{s.emoji}</span>
              <span style={{ color: selectedSources.includes(s.id) ? s.color : 'var(--muted)' }}>{s.label}</span>
            </label>
          ))}
        </div>

        {/* Keyword input */}
        <form onSubmit={handleScrape} style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder='Type any keyword... e.g. "dentist Mumbai" or "furniture manufacturer Delhi"'
            disabled={loading}
            style={{ flex: 1, minWidth: 260, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '.6rem 1rem', fontSize: '.9rem', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={loading || !keyword.trim() || selectedSources.length === 0}
            style={{ background: loading ? '#333' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '.6rem 1.5rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '.9rem', whiteSpace: 'nowrap' }}
          >
            {loading ? '⏳ Scraping...' : '▶ Run Scrape'}
          </button>
        </form>

        {/* Quick keyword chips */}
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
          {['dentist Mumbai', 'yoga trainer Delhi', 'furniture manufacturer', 'car mechanic Bangalore', 'skincare doctor'].map(kw => (
            <button key={kw} onClick={() => setKeyword(kw)} style={{ background: 'rgba(108,99,255,.1)', border: '1px solid rgba(108,99,255,.3)', color: '#a09bff', fontSize: '.7rem', padding: '3px 10px', borderRadius: 20, cursor: 'pointer' }}>
              {kw}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && !error && (
          <div style={{ marginTop: '1rem', padding: '.75rem 1rem', background: 'rgba(0,217,160,.08)', border: '1px solid rgba(0,217,160,.3)', borderRadius: 8, fontSize: '.85rem' }}>
            ✅ Scraped <strong>{result.total}</strong> leads for <em>"{result.keyword}"</em> — <span style={{ color: 'var(--green)' }}>{result.hot} hot</span> · <span style={{ color: 'var(--muted)' }}>{result.cold} cold</span>
          </div>
        )}
        {error && (
          <div style={{ marginTop: '1rem', padding: '.75rem 1rem', background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.3)', borderRadius: 8, fontSize: '.85rem', color: 'var(--red)' }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/leads" style={{ background: 'var(--accent)', color: '#fff', padding: '.6rem 1.2rem', borderRadius: 8, fontWeight: 700, fontSize: '.85rem', textDecoration: 'none' }}>
          View All Leads →
        </Link>
        <button onClick={triggerBulkFollowup} style={{ background: 'transparent', color: 'var(--green)', border: '1px solid var(--green)', padding: '.6rem 1.2rem', borderRadius: 8, fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
          ✉️ Email All Hot Leads
        </button>
        <button onClick={fetchStats} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.6rem 1.2rem', borderRadius: 8, fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
          🔄 Refresh Stats
        </button>
      </div>

      {/* Live logs */}
      <div style={{ background: '#0a0c10', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
        <div style={{ fontSize: '.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '.5rem' }}>Live Logs</div>
        {logs.length === 0
          ? <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>Logs appear here when you run a scrape...</div>
          : logs.map((log, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: '.7rem', color: log.includes('❌') ? 'var(--red)' : log.includes('✅') ? 'var(--green)' : '#a09bff', padding: '2px 0', borderBottom: '1px solid rgba(30,35,50,.4)' }}>
              {log}
            </div>
          ))
        }
      </div>
    </div>
  )
}
