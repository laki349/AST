// Supabase Edge Function: 핏 계산 결과 → 자연어 조언 (AI-4)
// 배포: supabase secrets set ANTHROPIC_API_KEY=...  →  supabase functions deploy explain
// API 키는 서버에만 둔다 (앱에 넣지 않음).
import Anthropic from "npm:@anthropic-ai/sdk";
import { corsHeaders } from "npm:@supabase/supabase-js@^2/cors";
import { isGrounded } from "../_shared/number-guard.ts";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

// 기본 모델. 비용을 더 줄이려면 팀 판단으로 "claude-haiku-5-5"로 바꿔 품질 비교 후 결정.
const MODEL = "claude-opus-5-5";

const SYSTEM = `너는 옷 핏 어드바이저다. 입력은 사이즈별 실측 기반 핏 계산 결과(JSON)다.
규칙:
- 입력 JSON에 있는 숫자만 사용한다. 새로운 치수나 퍼센트를 만들지 않는다.
- 판정(grade)은 입력값을 그대로 따른다. 다시 판단하지 않는다.
- 사용자가 원하는 핏에 비춰 추천 사이즈 1개와 이유를 2~3문장으로 말한다.
- grade 표기: slim=슬림, regular=레귤러, semi-over=세미오버, oversized=오버핏, tight=타이트, impossible=입기 어려움
- sleeveEndCm: 양수는 손목보다 김, 음수는 짧음. shoulderDropCm: 양수는 어깨선이 내려옴.`;

function fallbackText(results: { size: string; overall: string }[], preferred: string) {
  return `원하는 핏(${preferred}) 기준 사이즈별 판정: ` +
    results.map((r) => `${r.size} ${r.overall}`).join(", ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return Response.json({ ok: true }, { headers: corsHeaders });
  try {
    const { results, preferred } = await req.json();
    const input = JSON.stringify({ preferred, results });

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        output_config: { effort: "low" }, // 짧은 요약 작업이라 낮은 effort로 충분
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default", // 안전 분류기 거절 시 서버가 대체 모델로 재시도
        messages: [{ role: "user", content: input }],
      });
      if (res.stop_reason === "refusal") break;
      const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      if (isGrounded(text, { preferred, results }).ok) {
        return Response.json({ text, grounded: true }, { headers: corsHeaders });
      }
      // 입력에 없는 숫자가 나오면 한 번 더 생성
    }
    return Response.json({ text: fallbackText(results, preferred), grounded: false }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
