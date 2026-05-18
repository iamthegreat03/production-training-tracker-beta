import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.3.0/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$'
  const all = upper + lower + digits + special
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)]
  // Guarantee at least one of each type
  const required = [rand(upper), rand(lower), rand(digits), rand(special)]
  const rest = Array.from({ length: 8 }, () => rand(all))
  return [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS })

  // Verify caller is authenticated admin/trainer
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: CORS })

  const { data: roleData } = await userClient
    .from('user_roles').select('role').eq('auth_user_id', user.id).single()
  if (!roleData || !['admin', 'trainer'].includes(roleData.role)) {
    return new Response('Forbidden', { status: 403, headers: CORS })
  }

  // Admin Supabase client (service role — server only)
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { action, requestId, role, designerId } = await req.json()

  // Fetch the request
  const { data: request, error: reqError } = await admin
    .from('access_requests').select('*').eq('id', requestId).single()
  if (reqError || !request) {
    return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
  if (request.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Request already processed' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // ── Reject ──
  if (action === 'reject') {
    await admin.from('access_requests').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId)
    return new Response(JSON.stringify({ success: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
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
    return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // For designer role with no existing profile selected, auto-create one
  const assignedRole = role ?? request.requested_role
  let resolvedDesignerId = designerId ?? null

  if (assignedRole === 'designer' && !resolvedDesignerId) {
    const { data: newDesigner } = await admin
      .from('designers')
      .insert({ name: request.name, email: request.email, rank: 'Tier 3' })
      .select()
      .single()
    if (newDesigner) resolvedDesignerId = newDesigner.id
  }

  // Create user_roles record
  await admin.from('user_roles').insert({
    auth_user_id: authData.user.id,
    role: assignedRole,
    designer_id: resolvedDesignerId,
    permissions: null,
  })

  // Mark request approved
  await admin.from('access_requests').update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
  }).eq('id', requestId)

  // Send email via Gmail SMTP
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
      content: `Hi ${request.name},\n\nYour access request has been approved!\n\nHere are your login credentials:\n\nEmail: ${request.email}\nPassword: ${password}\n\nPlease log in and change your password after your first sign-in.\n\n— RWDS Design Team`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #e5e5e5; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; line-height: 48px; font-size: 24px;">⚡</div>
            <h1 style="margin: 12px 0 4px; font-size: 20px; color: #ffffff;">PT Tracker</h1>
            <p style="margin: 0; font-size: 12px; color: #737373;">Production Training Command Center</p>
          </div>
          <h2 style="font-size: 16px; color: #ffffff; margin-bottom: 8px;">Hi ${request.name}, your account is ready!</h2>
          <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6;">Your access request has been approved. Here are your login credentials:</p>
          <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #737373; margin-bottom: 4px;">Email</div>
              <div style="font-size: 14px; color: #ffffff;">${request.email}</div>
            </div>
            <div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #737373; margin-bottom: 4px;">Password</div>
              <div style="font-size: 16px; font-family: monospace; color: #f97316; background: #f9731615; padding: 8px 12px; border-radius: 8px; letter-spacing: 0.05em;">${password}</div>
            </div>
          </div>
          <p style="color: #737373; font-size: 12px; line-height: 1.6;">Please log in and change your password after your first sign-in.</p>
          <p style="color: #525252; font-size: 11px; margin-top: 24px;">— RWDS Design Team</p>
        </div>
      `,
    })
    await smtp.close()
  } catch (emailErr) {
    // Account was created — log the email failure but don't fail the whole request
    console.error('Email send failed:', emailErr)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
