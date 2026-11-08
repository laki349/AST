// 실행: node AST/prototype/smoke-test.ts  (Node 22.6+ 타입 제거 실행)
import assert from "node:assert/strict";
import { computeFit, recommendSize, type Body, type GarmentSize, type Fabric } from "./fit-engine.ts";
import { isGrounded } from "./number-guard.ts";
import { estimateFabric, type FabricRecord } from "./fabric-knn.ts";

const body: Body = { chest: 96, waist: 82, shoulder: 45, arm: 60, backLength: 44 };
const cotton: Fabric = { stretchWeft: 0.03, thicknessMm: 0.6 };
const sizes: GarmentSize[] = [
  { label: "S", totalLength: 68, shoulder: 44, chestHalf: 50, waistHalf: 48, sleeveLength: 58 },
  { label: "M", totalLength: 70, shoulder: 46, chestHalf: 53, waistHalf: 51, sleeveLength: 59.5 },
  { label: "L", totalLength: 72, shoulder: 48, chestHalf: 56, waistHalf: 54, sleeveLength: 61 },
];

const results = sizes.map((s) => computeFit(body, s, cotton));
for (const r of results) console.log(JSON.stringify(r));

// S: 가슴 100 - 0.38(두께) - 96 = 3.6 → slim
assert.equal(results[0].zones[0].grade, "slim");
// 사이즈가 커질수록 여유량이 단조 증가해야 함 (차별점: 사이즈별 결과가 달라짐)
assert.ok(results[0].zones[0].easeCm < results[1].zones[0].easeCm);
assert.ok(results[1].zones[0].easeCm < results[2].zones[0].easeCm);
// M 소매: 어깨 0.5 + 59.5 - 60 = 0
assert.equal(results[1].sleeveEndCm, 0);

// 신축성 없는 원단에서 몸보다 작으면 입기 어려움
const tiny: GarmentSize = { ...sizes[0], label: "XS", chestHalf: 45 };
assert.equal(computeFit(body, tiny, cotton).overall, "impossible");
// 같은 치수라도 스판 원단이면 타이트로 착용 가능
assert.equal(computeFit(body, { ...tiny, chestHalf: 47 }, { stretchWeft: 0.15, thicknessMm: 0.6 }).overall, "tight");

console.log("recommend regular →", recommendSize(body, sizes, cotton, "regular").size);

// 숫자 검증: 입력에 없는 숫자가 있으면 걸러야 함
const fit = results[1];
assert.equal(isGrounded(`M은 가슴 여유가 ${fit.zones[0].easeCm}cm로 레귤러예요.`, fit).ok, true);
assert.equal(isGrounded("M은 가슴 여유가 12cm예요.", fit).ok, false);

const db: FabricRecord[] = [
  { id: "f1", knit: true, cottonPct: 95, polyPct: 0, elastanePct: 5, thicknessMm: 0.7, stretchWeft: 0.18, drape: 40 },
  { id: "f2", knit: true, cottonPct: 100, polyPct: 0, elastanePct: 0, thicknessMm: 0.6, stretchWeft: 0.08, drape: 35 },
  { id: "f3", knit: false, cottonPct: 100, polyPct: 0, elastanePct: 0, thicknessMm: 0.3, stretchWeft: 0.02, drape: 20 },
  { id: "f4", knit: true, cottonPct: 92, polyPct: 0, elastanePct: 8, thicknessMm: 0.8, stretchWeft: 0.25, drape: 45 },
];
const est = estimateFabric({ knit: true, cottonPct: 94, polyPct: 0, elastanePct: 6, thicknessMm: 0.7 }, db, 2);
console.log("fabric estimate →", est);
assert.deepEqual(est.basedOn.sort(), ["f1", "f4"]);

console.log("ALL OK");
