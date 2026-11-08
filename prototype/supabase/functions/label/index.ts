// Supabase Edge Function: 케어라벨 사진 → 혼용률 JSON (AI-2)
import Anthropic from "npm:@anthropic-ai/sdk";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { z } from "npm:zod";
import { corsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const MODEL = "claude-opus-5-5";

const LabelSchema = z.object({
  composition: z.array(z.object({
    fiber: z.enum(["면", "폴리에스터", "폴리우레탄", "나일론", "레이온", "울", "아크릴", "린넨", "기타"]),
    pct: z.number(),
  })),
  knit_guess: z.enum(["knit", "woven", "unknown"]),
  readable: z.boolean(), // 라벨이 흐려서 못 읽으면 false
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return Response.json({ ok: true }, { headers: corsHeaders });
  try {
    const { imageBase64, mediaType } = await req.json(); // mediaType: "image/jpeg" 등
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      output_config: { effort: "low", format: zodOutputFormat(LabelSchema) },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "의류 케어라벨이다. 겉감 혼용률만 추출해라. 약어는 풀어서(C=면, PU/스판=폴리우레탄, P/PE=폴리에스터). 안감·배색은 제외. 읽을 수 없으면 readable=false." },
        ],
      }],
    });
    const label = res.parsed_output;
    if (!label) throw new Error("parse failed");
    const total = label.composition.reduce((s, c) => s + c.pct, 0);
    // 합계가 100이 아니면 사람이 확인하도록 표시 (자동 저장 금지)
    return Response.json({ ...label, needsReview: !label.readable || Math.abs(total - 100) > 0.5 }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
