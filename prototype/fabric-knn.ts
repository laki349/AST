// 원단 물성 추정 (k-최근접 이웃). 직접 측정한 원단 DB에서 비슷한 원단 k개를 찾아 평균.
// 근거 원단 목록을 함께 돌려줘서 "어떤 원단을 근거로 추정했는지" 설명 가능.

export type FabricRecord = {
  id: string;
  knit: boolean;          // 니트(편직) true / 우븐(직조) false
  cottonPct: number;
  polyPct: number;
  elastanePct: number;    // 폴리우레탄·스판
  thicknessMm: number;
  stretchWeft: number;    // 측정값 (0.05 = 5%)
  drape: number;          // 간이 캔틸레버 처짐 각도 (도)
};

export type FabricQuery = Omit<FabricRecord, "id" | "stretchWeft" | "drape">;

// 거리 가중치: 스판 함량과 니트 여부가 신축성에 가장 큰 영향
function distance(a: FabricQuery, b: FabricQuery): number {
  return Math.sqrt(
    (a.knit === b.knit ? 0 : 1) * 30 ** 2 +
    ((a.elastanePct - b.elastanePct) * 5) ** 2 +
    (a.cottonPct - b.cottonPct) ** 2 * 0.1 +
    (a.polyPct - b.polyPct) ** 2 * 0.1 +
    ((a.thicknessMm - b.thicknessMm) * 20) ** 2,
  );
}

export function estimateFabric(q: FabricQuery, db: FabricRecord[], k = 3) {
  const neighbors = db
    .map((r) => ({ r, d: distance(q, r) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, k);
  const avg = (f: (r: FabricRecord) => number) =>
    neighbors.reduce((s, n) => s + f(n.r), 0) / neighbors.length;
  const meanDist = neighbors.reduce((s, n) => s + n.d, 0) / neighbors.length;
  return {
    stretchWeft: Math.round(avg((r) => r.stretchWeft) * 1000) / 1000,
    drape: Math.round(avg((r) => r.drape)),
    basedOn: neighbors.map((n) => n.r.id),
    confidence: meanDist < 10 ? "high" : meanDist < 30 ? "medium" : "low",
  };
}
