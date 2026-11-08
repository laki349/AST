// AST fit engine — deterministic (no AI). PRD 5장 공식 구현.
// 단위: cm (두께만 mm)

export type Body = {
  chest: number;      // 가슴둘레
  waist: number;      // 허리둘레
  shoulder: number;   // 어깨너비 (어깨끝점~어깨끝점, 등 쪽 곡선 따라)
  arm: number;        // 팔길이 (어깨끝점~손목뼈)
  backLength: number; // 목뒤점~허리선
};

export type GarmentSize = {
  label: string;      // "S" | "M" | "L" ...
  totalLength: number;
  shoulder: number;
  chestHalf: number;  // 가슴단면 (평평하게 놓고 잰 값)
  waistHalf: number;
  sleeveLength: number;
};

export type Fabric = {
  stretchWeft: number; // 가로 신축률 (0.05 = 5%)
  thicknessMm: number;
};

export type Grade = "impossible" | "tight" | "slim" | "regular" | "semi-over" | "oversized";

export type ZoneResult = { zone: "chest" | "waist"; easeCm: number; grade: Grade };

export type FitResult = {
  size: string;
  zones: ZoneResult[];
  shoulderDropCm: number; // +: 어깨끝점보다 아래로 내려옴
  sleeveEndCm: number;    // +: 손목뼈보다 아래(김), -: 위(짧음)
  hemFromWaistCm: number; // +: 허리선보다 아래
  overall: Grade;
};

// 초기값 — 사전 착용 테스트로 보정 (PRD 5.3)
export const GRADE_BOUNDS = { slim: 6, regular: 14, semiOver: 24 };
export const COMFORT_FACTOR = 0.5;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function gradeFor(ease: number, bodyCirc: number, fabric: Fabric): Grade {
  if (ease < 0) {
    const maxSqueeze = bodyCirc * fabric.stretchWeft * COMFORT_FACTOR;
    return -ease > maxSqueeze ? "impossible" : "tight";
  }
  if (ease < GRADE_BOUNDS.slim) return "slim";
  if (ease < GRADE_BOUNDS.regular) return "regular";
  if (ease < GRADE_BOUNDS.semiOver) return "semi-over";
  return "oversized";
}

// 두꺼운 원단은 안쪽 둘레가 줄어든다: 유효 둘레 = 단면×2 − 2π×두께
function effectiveCirc(half: number, fabric: Fabric): number {
  return half * 2 - 2 * Math.PI * (fabric.thicknessMm / 10);
}

export function computeFit(body: Body, g: GarmentSize, fabric: Fabric): FitResult {
  const chestEase = effectiveCirc(g.chestHalf, fabric) - body.chest;
  const waistEase = effectiveCirc(g.waistHalf, fabric) - body.waist;
  const zones: ZoneResult[] = [
    { zone: "chest", easeCm: round1(chestEase), grade: gradeFor(chestEase, body.chest, fabric) },
    { zone: "waist", easeCm: round1(waistEase), grade: gradeFor(waistEase, body.waist, fabric) },
  ];
  const shoulderDrop = (g.shoulder - body.shoulder) / 2;
  return {
    size: g.label,
    zones,
    shoulderDropCm: round1(shoulderDrop),
    sleeveEndCm: round1(shoulderDrop + g.sleeveLength - body.arm),
    hemFromWaistCm: round1(g.totalLength - body.backLength),
    overall: zones[0].grade, // 상의는 가슴 기준
  };
}

// 사용자가 원하는 핏에 가장 가까운 사이즈 추천 (가슴 여유량 기준)
const TARGET_EASE: Record<"slim" | "regular" | "semi-over" | "oversized", number> = {
  slim: 3, regular: 10, "semi-over": 19, oversized: 28,
};

export function recommendSize(
  body: Body, sizes: GarmentSize[], fabric: Fabric,
  preferred: keyof typeof TARGET_EASE,
): FitResult {
  const results = sizes.map((s) => computeFit(body, s, fabric))
    .filter((r) => r.overall !== "impossible");
  const score = (r: FitResult) =>
    Math.abs(r.zones[0].easeCm - TARGET_EASE[preferred]) +
    Math.abs(r.sleeveEndCm) * 0.5; // 소매가 손목에서 멀수록 감점
  return results.sort((a, b) => score(a) - score(b))[0];
}
