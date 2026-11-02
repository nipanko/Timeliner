// Supabase Edge Function: a 13-17 user asks a parent for consent; the parent gets an email with a confirm link.
// Deploy: Supabase dashboard -> Edge Functions -> Deploy a new function -> name `send-consent-email`, paste this file.
// Secrets (Edge Functions -> Secrets): RESEND_API_KEY, SITE_URL (https://your-domain), CONSENT_FROM ("TIMELINER <hello@your-domain>").
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const env = (k: string) => Deno.env.get(k) ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'POST only' });

  // Who is asking: the signed-in teen (their own token, checked by Supabase).
  const asUser = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who.user) return reply(401, { error: 'Please sign in again.' });

  const { parentEmail } = await req.json().catch(() => ({ parentEmail: '' }));
  const email = String(parentEmail ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply(400, { error: 'That email address looks wrong.' });
  if (email === who.user.email?.toLowerCase()) return reply(400, { error: "Use your parent's email, not your own." });

  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: profile } = await admin.from('profiles').select('consent, birth_year').eq('id', who.user.id).maybeSingle();
  if (!profile || profile.consent !== 'pending') return reply(409, { error: 'No consent is needed for this account.' });

  // One email per 10 minutes, so the button can't be used to spam someone.
  const { data: last } = await admin.from('consent_requests').select('requested_at').eq('user_id', who.user.id).maybeSingle();
  if (last && Date.now() - new Date(last.requested_at).getTime() < 10 * 60_000) return reply(429, { error: 'Already sent. You can send again in a few minutes.' });

  const { data: request, error } = await admin
    .from('consent_requests')
    .upsert({ user_id: who.user.id, parent_email: email, token: crypto.randomUUID(), requested_at: new Date().toISOString(), confirmed_at: null, parent_name: null })
    .select('token')
    .single();
  if (error || !request) return reply(500, { error: 'Could not save the request. Try again.' });

  const link = `${env('SITE_URL')}/consent?token=${request.token}`;
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('CONSENT_FROM'),
      to: email,
      subject: 'Your child asked to use TIMELINER',
      text: [
        'Hello,',
        '',
        `Someone born in ${profile.birth_year} asked to back up their TIMELINER planner with an account and named you as their parent or guardian.`,
        'TIMELINER is a planner app. With an account we store their plans on our server so they can sync between devices. No ads, no tracking, no social features for under-18s.',
        '',
        `To agree, open this link within 7 days: ${link}`,
        '',
        "If you don't know about this, ignore this email; nothing changes.",
      ].join('\n'),
    }),
  });
  if (!sent.ok) return reply(502, { error: 'The email could not be sent. Try again later.' });
  return reply(200, { ok: true });
});
