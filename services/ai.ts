// AI tutor brain. Three layers:
//  1. Supabase Edge Function (keys stay on the server)        -> when signed in
//  2. Direct OpenAI / Gemini call with an EXPO_PUBLIC key      -> dev convenience, key ships inside the APK
//  3. Offline rule-based engine                                -> always available, needs no network or key
import type { Course, Roleplay } from '@/data/types';
import { useApp } from '@/store/app';
import { supabase } from './supabase';
import type { ChatMsg } from './tutor-engine';

export * from './tutor-engine';

export type AiMode = 'edge' | 'openai' | 'gemini' | 'offline';

export function aiMode(): AiMode {
  if (supabase && useApp.getState().userId) return 'edge';
  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) return 'openai';
  if (process.env.EXPO_PUBLIC_GEMINI_API_KEY) return 'gemini';
  return 'offline';
}

export const aiLabel = (m: AiMode) =>
  m === 'edge' ? 'Cloud AI (secure)' : m === 'openai' ? 'OpenAI (direct key)' : m === 'gemini' ? 'Gemini (direct key)' : 'Offline tutor engine';

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

/** Returns the model reply, or null when no AI is configured / the call failed. The caller then uses the offline engine. */
export async function llmReply(system: string, history: ChatMsg[]): Promise<string | null> {
  const mode = aiMode();
  if (mode === 'offline') return null;
  try {
    if (mode === 'edge' && supabase) {
      const { data, error } = await withTimeout(supabase.functions.invoke('ai-tutor', { body: { system, messages: history } }), 15000);
      if (error) return null;
      const reply = (data as { reply?: string } | null)?.reply;
      return reply ? String(reply).trim() : null;
    }
    if (mode === 'openai') {
      const res = await withTimeout(
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 160,
            messages: [{ role: 'system', content: system }, ...history.map((m) => ({ role: m.role, content: m.text }))],
          }),
        }),
        15000
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return json.choices?.[0]?.message?.content?.trim() ?? null;
    }
    if (mode === 'gemini') {
      const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
      const res = await withTimeout(
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
            generationConfig: { temperature: 0.7, maxOutputTokens: 160 },
          }),
        }),
        15000
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function callSystemPrompt(course: Course): string {
  return [
    `You are ${course.persona.name}, a warm ${course.targetName} tutor on a video call with a ${course.nativeName} speaker who is a beginner (A1-A2).`,
    `Speak ONLY in simple ${course.targetName}. Reply in 1 or 2 short sentences, then ask ONE easy follow-up question.`,
    `If the learner makes a grammar mistake, repeat the correct sentence naturally in your reply. Never use markdown or emojis.`,
  ].join(' ');
}

export function roleplaySystemPrompt(course: Course, rp: Roleplay): string {
  return [
    `You are ${rp.persona.name}, a ${rp.persona.role}. Scenario: ${rp.setting}`,
    `The learner is a beginner practicing ${course.targetName}. Stay in character and speak ONLY simple ${course.targetName}, 1 or 2 short sentences.`,
    `Steer the conversation so the learner can complete: ${rp.goals.map((g) => g.text).join('; ')}. No markdown, no emojis.`,
  ].join(' ');
}

