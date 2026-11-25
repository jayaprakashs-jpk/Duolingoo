// Supabase Edge Function: RevenueCat -> subscription_entitlements. This is the ONLY writer of that table.
// Deploy:  supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secrets: supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random string>
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically)
// In RevenueCat: Integrations > Webhooks > URL = this function, Authorization header = the same secret.
// The client must call Purchases.logIn(<supabase user id>) so `app_user_id` is the Supabase user id.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// RevenueCat entitlement identifiers -> LinguaSpark tier (highest wins)
const ORDER = ['max', 'family', 'super'];

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (req.headers.get('authorization') !== Deno.env.get('REVENUECAT_WEBHOOK_SECRET')) return new Response('unauthorized', { status: 401 });

  const payload: any = await req.json().catch(() => null);
  const ev = payload?.event;
  if (!ev?.app_user_id) return new Response('bad payload', { status: 400 });
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(ev.app_user_id)) return new Response('ignored: anonymous id', { status: 200 });

  const ids: string[] = ev.entitlement_ids ?? (ev.entitlement_id ? [ev.entitlement_id] : []);
  const ends = ['EXPIRATION'].includes(ev.type);
  const tier = ends ? 'free' : (ORDER.find((t) => ids.includes(t)) ?? 'free');
  const expires = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await sb
    .from('subscription_entitlements')
    .upsert({ user_id: ev.app_user_id, tier, source: 'revenuecat', expires_at: expires, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return new Response(error.message, { status: 500 });
  return new Response('ok');
});
