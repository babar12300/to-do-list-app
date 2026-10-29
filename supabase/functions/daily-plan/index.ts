import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { streamText, APICallError } from "npm:ai@6";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { createLovableAiGatewayRunIdFetch } from "./run-id.ts";

const RUN = "X-Lovable-AIG-Run-ID";
const cors = {
  ...corsHeaders,
  "Access-Control-Allow-Headers": `${corsHeaders["Access-Control-Allow-Headers"]}, x-lovable-aig-run-id`,
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

const BodySchema = z.object({
  description: z.string().max(4000).default(""),
  tasks: z.string().max(16000).default(""),
  today: z.string().max(200).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST to create a plan." }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json({ error: "Sign-in is not configured." }, 500);
  const sb = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await sb.auth.getClaims(auth.replace(/^Bearer /, ""));
  if (!claims?.claims?.sub) return json({ error: "Please sign in to use the AI planner." }, 401);

  let input: unknown;
  try { input = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const parsed = BodySchema.safeParse(input);
  if (!parsed.success) return json({ error: "Enter valid task descriptions and deadlines." }, 400);
  const body = parsed.data;
  const description = body.description.trim();
  const tasks = body.tasks.trim();
  if (!description && !tasks) return json({ error: "Describe your tasks first." }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured." }, 500);
  const gateway = createLovableAiGatewayRunIdFetch(req.headers.get(RUN) ?? undefined);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: gateway.fetch,
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
    const runId = gateway.getRunId();
    const extra = runId ? { [RUN]: runId } : {};
    if (!plan) return json({ error: "The AI could not make a plan for this request." }, 422, extra);
    return json({ plan }, 200, extra);
  } catch (e) {
    if (req.signal.aborted) return json({ error: "Cancelled" }, 499);
    const status = APICallError.isInstance(e) ? e.statusCode ?? 500 : 500;
    let message = "Could not create a plan. Please try again later.";
    if (APICallError.isInstance(e)) { try { message = JSON.parse(e.responseBody ?? "{}")?.error?.message ?? JSON.parse(e.responseBody ?? "{}")?.message ?? message; } catch { /* keep */ } }
    const runId = gateway.getRunId();
    return json({ error: message }, status, runId ? { [RUN]: runId } : {});
  }
});
