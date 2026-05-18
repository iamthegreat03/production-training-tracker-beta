import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.3.0/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$'
  const all = upper + lower + digits + special

  function randChar(set: string): string {
    const bytes = new Uint8Array(1)
    let c: number
    // Rejection sampling to eliminate modulo bias
    do { crypto.getRandomValues(bytes); c = bytes[0] } while (c >= 256 - (256 % set.length))
    return set[c % set.length]
  }

  const chars = [
    randChar(upper), randChar(lower), randChar(digits), randChar(special),
    ...Array.from({ length: 8 }, () => randChar(all)),
  ]

  // Fisher-Yates shuffle with crypto.getRandomValues
  for (let i = chars.length - 1; i > 0; i--) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    const j = (new DataView(bytes.buffer).getUint32(0) >>> 0) % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized: no auth header' })

    // Verify caller is authenticated
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized: ' + (userError?.message ?? 'no user') })

    // Verify caller is admin or trainer
    const { data: roleData, error: roleError } = await userClient
      .from('user_roles').select('role').eq('auth_user_id', user.id).single()
    if (roleError) return json({ error: 'Role lookup failed: ' + roleError.message })
    if (!roleData || !['admin', 'trainer'].includes(roleData.role)) {
      return json({ error: 'Forbidden: only admins and trainers can approve requests' })
    }

    // Admin Supabase client
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, requestId, role, designerId } = body

    // ── Delete user ── (handled before request fetch — no access_request involved)
    if (action === 'delete') {
      const { userId } = body
      if (!userId) return json({ error: 'userId required' })
      const { error: roleErr } = await admin.from('user_roles').delete().eq('auth_user_id', userId)
      if (roleErr) return json({ error: 'Failed to remove role: ' + roleErr.message })
      const { error: authErr } = await admin.auth.admin.deleteUser(userId)
      if (authErr) return json({ error: 'Failed to delete auth user: ' + authErr.message })
      return json({ success: true })
    }

    // Fetch the access request
    const { data: request, error: reqError } = await admin
      .from('access_requests').select('*').eq('id', requestId).single()
    if (reqError || !request) return json({ error: 'Request not found: ' + (reqError?.message ?? '') })
    if (request.status !== 'pending') return json({ error: `Request already ${request.status}` })

    // ── Reject ──
    if (action === 'reject') {
      const { error: updErr } = await admin.from('access_requests').update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      }).eq('id', requestId)
      if (updErr) return json({ error: 'Failed to reject: ' + updErr.message })
      return json({ success: true })
    }

    // ── Approve ──
    const password = generatePassword()

    // Create Supabase auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: request.email,
      password,
      email_confirm: true,
    })
    if (authError) {
      const alreadyExists = authError.message.toLowerCase().includes('already registered')
        || authError.message.toLowerCase().includes('already exists')
      return json({
        error: alreadyExists
          ? `An account for ${request.email} already exists in Supabase Auth. Delete it there first, then approve again.`
          : 'Failed to create auth user: ' + authError.message
      })
    }

    // Auto-create designer profile if role is designer and no existing profile linked
    const assignedRole = role ?? request.requested_role
    let resolvedDesignerId = designerId ?? null

    if (assignedRole === 'designer' && !resolvedDesignerId) {
      const { data: newDesigner, error: designerErr } = await admin
        .from('designers')
        .insert({ name: request.name, email: request.email, rank: 'Tier 3' })
        .select()
        .single()
      if (designerErr) console.error('Designer auto-create failed:', designerErr.message)
      if (newDesigner) resolvedDesignerId = newDesigner.id
    }

    // Create user_roles record
    const { error: roleInsertErr } = await admin.from('user_roles').insert({
      auth_user_id: authData.user.id,
      role: assignedRole,
      designer_id: resolvedDesignerId,
      name: request.name,
      email: request.email,
      permissions: null,
    })
    if (roleInsertErr) return json({ error: 'Failed to assign role: ' + roleInsertErr.message })

    // Mark request approved
    await admin.from('access_requests').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId)

    // Send email via Gmail SMTP (non-fatal if it fails)
    try {
      const smtp = new SMTPClient({
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465,
          tls: true,
          auth: {
            username: Deno.env.get('GMAIL_USER')!,
            password: Deno.env.get('GMAIL_APP_PASSWORD')!,
          },
        },
      })

      await smtp.send({
        from: `PT Tracker <${Deno.env.get('GMAIL_USER')}>`,
        to: [request.email],
        subject: 'Your PT Tracker account is ready',
        content: `Hi ${request.name},\n\nYour access request has been approved!\n\nEmail: ${request.email}\nPassword: ${password}\n\nPlease log in and change your password.\n\n— RWDS Design Team`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f0f;color:#e5e5e5;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:12px;line-height:48px;font-size:24px;">⚡</div>
              <h1 style="margin:12px 0 4px;font-size:20px;color:#ffffff;">PT Tracker</h1>
              <p style="margin:0;font-size:12px;color:#737373;">Production Training Command Center</p>
            </div>
            <h2 style="font-size:16px;color:#ffffff;">Hi ${request.name}, your account is ready!</h2>
            <p style="color:#a3a3a3;font-size:14px;line-height:1.6;">Your access request has been approved.</p>
            <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:16px;margin:20px 0;">
              <div style="margin-bottom:12px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#737373;margin-bottom:4px;">Email</div>
                <div style="font-size:14px;color:#ffffff;">${request.email}</div>
              </div>
              <div>
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#737373;margin-bottom:4px;">Password</div>
                <div style="font-size:16px;font-family:monospace;color:#f97316;background:#f9731615;padding:8px 12px;border-radius:8px;">${password}</div>
              </div>
            </div>
            <p style="color:#737373;font-size:12px;">Please log in and change your password after your first sign-in.</p>
            <p style="color:#525252;font-size:11px;margin-top:24px;">— RWDS Design Team</p>
          </div>
        `,
      })
      await smtp.close()
    } catch (emailErr) {
      console.error('Email send failed:', emailErr)
      // Account was created successfully — email failure is logged but not fatal
      return json({ success: true, emailWarning: 'Account created but email failed to send. Check Gmail credentials.' })
    }

    return json({ success: true })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Unexpected error: ' + (err instanceof Error ? err.message : String(err)) })
  }
})
