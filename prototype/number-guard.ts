// LLM 답변 숫자 검증: 답변에 나온 숫자가 모두 입력 데이터에 있어야 통과.
// 지어낸 치수가 섞이면 false → 재생성하거나 템플릿 문장으로 대체.

export function collectNumbers(value: unknown, out = new Set<number>()): Set<number> {
  if (typeof value === "number") {
    out.add(Math.abs(Math.round(value * 10) / 10));
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectNumbers(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectNumbers(v, out));
  }
  return out;
}

export function numbersInText(text: string): number[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

export function isGrounded(answer: string, input: unknown): { ok: boolean; unknown: number[] } {
  const allowed = collectNumbers(input);
  const unknown = numbersInText(answer).filter((n) => !allowed.has(n));
  return { ok: unknown.length === 0, unknown };
}
