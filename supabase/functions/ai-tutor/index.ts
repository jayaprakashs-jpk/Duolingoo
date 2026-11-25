// Supabase Edge Function: server-side proxy for the AI tutor, so API keys never ship inside the APK.
// Deploy:  supabase functions deploy ai-tutor
// Secrets: supabase secrets set OPENAI_API_KEY=sk-...    (or GEMINI_API_KEY=...)
// JWT verification is ON by default, so only signed-in users can call it.
// deno-lint-ignore-file no-explicit-any

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const system = String(body?.system ?? '').slice(0, 2000);
  const messages = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  const clean = messages.map((m: any) => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    text: String(m?.text ?? '').slice(0, 600),
  }));
  if (!system || clean.length === 0) return json({ error: 'system and messages are required' }, 400);

  const openai = Deno.env.get('OPENAI_API_KEY');
  const gemini = Deno.env.get('GEMINI_API_KEY');

  try {
    if (openai) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openai}` },
        body: JSON.stringify({
          model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 160,
          messages: [{ role: 'system', content: system }, ...clean.map((m: any) => ({ role: m.role, content: m.text }))],
        }),
      });
      if (!r.ok) return json({ error: 'upstream error', status: r.status }, 502);
      const j = await r.json();
      return json({ reply: j.choices?.[0]?.message?.content?.trim() ?? '' });
    }
    if (gemini) {
      const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: clean.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
          generationConfig: { temperature: 0.7, maxOutputTokens: 160 },
        }),
      });
      if (!r.ok) return json({ error: 'upstream error', status: r.status }, 502);
      const j = await r.json();
      return json({ reply: j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '' });
    }
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
  return json({ error: 'No AI key configured on the server. Set OPENAI_API_KEY or GEMINI_API_KEY.' }, 501);
});
