# AST — 실측 기반 AI 피팅룸

"예쁘게 입혀 보여주는 AI"가 아니라 "맞는지 알려주는 AI".
옷을 직접 실측(치수, 원단 신축성, 두께, 무게)해 디지털화하고, 사용자 몸 치수와 결합해 부위별로 어디가 끼고 어디가 남는지 계산·시각화하는 가상 피팅룸.

## 문서

| 파일 | 내용 |
|---|---|
| [PRD.md](PRD.md) | 제품 요구사항 (문제 정의, 경쟁 분석, 핏 계산 원리, 사업화) |
| [AI-ARCHITECTURE.md](AI-ARCHITECTURE.md) | AI 기능 구조와 기술 선택 근거 |
| [EXECUTION-PLAN.md](EXECUTION-PLAN.md) | 역할 분담, 사전 준비 일정, 본선 9시간 계획 |
| [submission-ai.md](submission-ai.md) | 예선 제출문: AI 기술 활용 방안 |

## 프로토타입

| 파일 | 내용 |
|---|---|
| `prototype/fit-engine.ts` | 핏 계산 엔진 (AI 아님, 결정적 계산) |
| `prototype/fabric-knn.ts` | 원단 물성 k-NN 추정 |
| `prototype/number-guard.ts` | LLM 답변 숫자 검증 |
| `prototype/body_model.py` | 신체 치수 추정 모델 학습 (Colab) |
| `prototype/body-estimate.ts` | 앱 내 신체 추정 |
| `prototype/supabase/` | DB 스키마, 서버 함수 (핏 조언, 케어라벨 인식) |

```bash
node prototype/smoke-test.ts            # Node 22.6+
python3 prototype/body_model.py --demo  # 가짜 데이터로 학습 파이프라인 점검
```

## 일정

- 예선(아이디어) 제출: 2026-11-09
- 본선(구현): 2026-11-20 09:00–18:00

## 보안

API 키는 `supabase secrets set`으로 서버에만 저장한다. `.env`와 키는 커밋하지 않는다.
