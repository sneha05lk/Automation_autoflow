// lib/mailer.ts
// Sends emails via Resend API — works 100% server-side
// No npm package needed — uses native fetch

interface EmailOptions {
  to:      string
  name:    string
  keyword: string
  source:  string
  step:    1 | 2 | 3
}

function buildEmailHTML(firstName: string, keyword: string, source: string, step: 1 | 2 | 3): { subject: string; html: string } {
  const sourceLabel = source.charAt(0).toUpperCase() + source.slice(1)

  const templates = {
    1: {
      subject: `Quick question, ${firstName}`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
  <tr><td style="background:#6c63ff;padding:24px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">AutoFlow</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Lead Generation & Automation</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">Hi ${firstName},</p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">
      I came across your profile on <strong>${sourceLabel}</strong> while researching 
      <strong>${keyword}</strong> professionals.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">
      We help businesses like yours automate their lead generation and client outreach — 
      saving 10+ hours every week while increasing conversions.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 24px">
      Would a quick 15-minute call be worth exploring?
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="background:#6c63ff;border-radius:6px;padding:12px 28px">
        <a href="mailto:${process.env.REPLY_TO_EMAIL || 'hello@autoflow.com'}" 
           style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px">
          Reply to Schedule a Call →
        </a>
      </td></tr>
    </table>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0">
      Best regards,<br/>
      <strong>AutoFlow Team</strong>
    </p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee">
    <p style="color:#999;font-size:12px;margin:0;line-height:1.6">
      You received this because you appear in public ${sourceLabel} listings for "${keyword}". 
      To unsubscribe, reply with "unsubscribe".
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
    },

    2: {
      subject: `Re: Quick question, ${firstName}`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
  <tr><td style="background:#6c63ff;padding:24px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">AutoFlow</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">Hi ${firstName},</p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">
      Just following up on my last message about <strong>${keyword}</strong>.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">
      We've helped similar <strong>${sourceLabel}</strong> businesses increase their 
      client response rate by 30% using smart automation.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 24px">
      Happy to share a quick case study. Worth a short chat?
    </p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0">
      Best,<br/><strong>AutoFlow Team</strong>
    </p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee">
    <p style="color:#999;font-size:12px;margin:0">To unsubscribe, reply with "unsubscribe".</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
    },

    3: {
      subject: `Closing the loop, ${firstName}`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
  <tr><td style="background:#6c63ff;padding:24px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">AutoFlow</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">Hi ${firstName},</p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">
      I'll keep this short — if automation isn't a priority right now, totally understood.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px">
      Just let me know and I won't follow up again. 
      If timing changes in the future, you know where to find us!
    </p>
    <p style="color:#333;font-size:15px;line-height:1.7;margin:0">
      Wishing you all the best,<br/><strong>AutoFlow Team</strong>
    </p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee">
    <p style="color:#999;font-size:12px;margin:0">To unsubscribe, reply with "unsubscribe".</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
    },
  }

  return templates[step]
}

// ── SEND ONE EMAIL ────────────────────────────────────────────────────────────
export async function sendLeadEmail({ to, name, keyword, source, step }: EmailOptions) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing from .env.local')
  }

  const firstName       = (name || '').split(' ')[0] || 'there'
  const { subject, html } = buildEmailHTML(firstName, keyword, source || 'google', step)

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName  = process.env.RESEND_FROM_NAME  || 'AutoFlow'

  const payload = {
    from:     `${fromName} <${fromEmail}>`,
    to:       [to],
    subject,
    html,
    reply_to: process.env.REPLY_TO_EMAIL || undefined,
  }

  console.log(`[MAILER] Sending to ${to} via Resend...`)

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: any = {}
  try {
    data = await res.json()
  } catch (e) {
    data = { message: 'Failed to parse Resend response' }
  }

  if (!res.ok) {
    console.error('[MAILER] Resend API error:', JSON.stringify(data))
    
    // Provide a more helpful error message for common issues
    let errorMsg = data?.message || res.statusText
    if (res.status === 403) {
      errorMsg = 'Permission denied. Ensure your Resend API Key is correct and your domain is verified.'
    } else if (res.status === 422) {
      errorMsg = 'Validation error. If using onboarding@resend.dev, you can only send to your own email.'
    }
    
    throw new Error(`Resend error: ${errorMsg}`)
  }

  console.log(`[MAILER] ✅ Email sent! ID: ${data.id}`)
  return { id: data.id, to, status: 'sent' }
}

// ── SEND BULK EMAILS WITH DELAY ───────────────────────────────────────────────
export async function sendBulkEmails(
  leads: Array<{
    id: string
    email: string
    name: string
    keyword: string
    source?: string
  }>,
  step: 1 | 2 | 3 = 1
) {
  const results: Array<{ id: string; email: string; status: string; error?: string }> = []

  for (const lead of leads) {
    try {
      await new Promise(r => setTimeout(r, 2500)) // 2.5s between sends

      await sendLeadEmail({
        to:      lead.email,
        name:    lead.name    || 'there',
        keyword: lead.keyword || 'your industry',
        source:  lead.source  || 'google',
        step,
      })

      results.push({ id: lead.id, email: lead.email, status: 'sent' })
    } catch (err: any) {
      console.warn(`[MAILER] ❌ Failed ${lead.email}:`, err.message)
      results.push({ id: lead.id, email: lead.email, status: 'failed', error: err.message })
    }
  }

  const sent   = results.filter(r => r.status === 'sent').length
  const failed = results.filter(r => r.status === 'failed').length
  console.log(`[MAILER] Bulk done — ✅ ${sent} sent  ❌ ${failed} failed`)

  return results
}
