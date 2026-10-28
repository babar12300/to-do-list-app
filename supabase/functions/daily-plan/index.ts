import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { streamText, APICallError } from "npm:ai@6";
import { createClient } from "npm:@supabase/supabase-js@2";

const RUN = "X-Lovable-AIG-Run-ID";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": RUN,
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, ...extra, "Content-Type": "application/json" } });

const INSTRUCTIONS = `You are a calm, practical day planner. The user describes tasks and deadlines.
Produce a prioritized plan for today. Order by urgency (deadlines) then importance, put hard work earlier, add short breaks, and be realistic about time.
Format in plain text:
Top priorities: a numbered list (max 3) with one-line reasons.
Schedule: lines like "09:00–10:30  Task — note".
Later / can wait: short bullet list of things to defer.
Keep it under 250 words. No markdown headers or bold.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await sb.auth.getClaims(auth.replace(/^Bearer /, ""));
  if (!claims?.claims?.sub) return json({ error: "Please sign in to use the AI planner." }, 401);

  let body: { description?: string; tasks?: string; today?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const description = (body.description ?? "").trim().slice(0, 4000);
  const tasks = (body.tasks ?? "").slice(0, 4000);
  if (!description && !tasks) return json({ error: "Describe your tasks first." }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured." }, 500);
  let runId = req.headers.get(RUN)?.trim() || undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN)?.trim() || undefined;
      return res;
    },
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: INSTRUCTIONS,
      messages: [{ role: "user", content: `Today is ${body.today ?? new Date().toDateString()}.\n\nWhat I need to do:\n${description}\n\nOpen tasks in my planner:\n${tasks || "(none)"}` }],
      abortSignal: req.signal,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
    });
    const plan = (await result.text).trim();
    const extra = runId ? { [RUN]: runId } : {};
    if (!plan) return json({ error: "The AI could not make a plan for this request." }, 422, extra);
    return json({ plan }, 200, extra);
  } catch (e) {
    if (req.signal.aborted) return json({ error: "Cancelled" }, 499);
    const status = APICallError.isInstance(e) ? e.statusCode ?? 500 : 500;
    let message = "Could not create a plan. Please try again later.";
    if (APICallError.isInstance(e)) { try { message = JSON.parse(e.responseBody ?? "{}")?.error?.message ?? JSON.parse(e.responseBody ?? "{}")?.message ?? message; } catch { /* keep */ } }
    if (status === 429) message = "Too many requests right now. Please wait a moment and try again.";
    return json({ error: message }, status);
  }
});
