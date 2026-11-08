// 앱 안에서 실행하는 신체 추정. body_model.json의 계수로 계산 (서버 불필요).

type PartModel = { intercept: number; coef: { height_cm: number; weight_kg: number }; mae_cm: number; std_cm: number };
export type BodyModel = Record<"male" | "female", Record<string, PartModel>>;

export type Estimate = { value: number; plusMinus: number; source: "estimated" | "measured" };

export function estimateBody(
  model: BodyModel,
  sex: "male" | "female",
  heightCm: number,
  weightKg: number,
  measured: Record<string, number> = {}, // 사용자가 줄자로 잰 값이 있으면 우선
): Record<string, Estimate> {
  const out: Record<string, Estimate> = {};
  for (const [part, m] of Object.entries(model[sex])) {
    if (measured[part] != null) {
      out[part] = { value: measured[part], plusMinus: 1, source: "measured" };
      continue;
    }
    const v = m.intercept + m.coef.height_cm * heightCm + m.coef.weight_kg * weightKg;
    out[part] = {
      value: Math.round(v * 10) / 10,
      plusMinus: Math.round(m.std_cm * 1.96 * 10) / 10, // 약 95% 범위
      source: "estimated",
    };
  }
  return out;
}
