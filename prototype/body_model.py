"""AST 신체 치수 추정 모델 학습 (Google Colab에서 실행).

입력: 키, 몸무게 (성별별로 모델 분리)
출력: 부위별 선형 회귀 계수 + 오차(MAE, 표준편차) → body_model.json → 앱에 포함

데이터:
- 1순위 사이즈코리아(이용 조건 확인 필요), 대체 ANSUR II (미 육군, 공개)
- ANSUR II 단위: 길이 mm, 몸무게 hectogram(0.1kg). 아래 COLUMN_MAP은
  CSV 헤더를 열어 실제 컬럼명을 확인한 뒤 맞출 것.

사용법:
  python body_model.py <남성 CSV> <여성 CSV> body_model.json
  python body_model.py --demo   # 가짜 데이터로 파이프라인만 점검
"""
import json
import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

# AST 부위명 → 데이터셋 컬럼명 (헤더 확인 후 수정)
# 주의: 옷 측정 기준과 부위 정의가 같아야 한다.
#   예) 옷 어깨너비는 어깨솔기 끝~끝이므로, 몸도 '어깨끝점 사이 길이(등 곡선 따라)'를 써야 함.
COLUMN_MAP = {
    "chest": "chestcircumference",
    "waist": "waistcircumference",
    "shoulder": "biacromialbreadth",   # 직선 폭이라 옷 기준과 차이 → 보정 필요 (본문 참고)
    "arm": "sleeveoutseam",
    "backLength": "waistbacklength",
}
FEATURES = ["height_cm", "weight_kg"]


def prepare(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame()
    out["height_cm"] = df["stature"] / 10
    out["weight_kg"] = df["weightkg"] / 10
    for part, col in COLUMN_MAP.items():
        out[part] = df[col] / 10
    return out.dropna()


def train(df: pd.DataFrame) -> dict:
    result = {}
    X = df[FEATURES].to_numpy()
    for part in COLUMN_MAP:
        y = df[part].to_numpy()
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
        model = LinearRegression().fit(X_tr, y_tr)
        pred = model.predict(X_te)
        result[part] = {
            "intercept": round(float(model.intercept_), 4),
            "coef": {f: round(float(c), 4) for f, c in zip(FEATURES, model.coef_)},
            "mae_cm": round(float(mean_absolute_error(y_te, pred)), 2),
            "std_cm": round(float(np.std(y_te - pred)), 2),  # 앱의 ±오차 범위 표시용
        }
    return result


def demo_data(n: int, male: bool) -> pd.DataFrame:
    rng = np.random.default_rng(0 if male else 1)
    h = rng.normal(1750 if male else 1620, 70, n)          # mm
    w = rng.normal(750 if male else 580, 110, n)           # hectogram
    noise = lambda s: rng.normal(0, s, n)
    return pd.DataFrame({
        "stature": h, "weightkg": w,
        "chestcircumference": 300 + 0.25 * h + 0.6 * w + noise(30),
        "waistcircumference": 100 + 0.15 * h + 0.9 * w + noise(40),
        "biacromialbreadth": 150 + 0.12 * h + 0.05 * w + noise(12),
        "sleeveoutseam": 30 + 0.33 * h + noise(15),
        "waistbacklength": 40 + 0.25 * h + noise(15),
    })


def main(argv: list[str]) -> None:
    if argv[:1] == ["--demo"]:
        male, female, out_path = demo_data(4000, True), demo_data(2000, False), None
    else:
        male = pd.read_csv(argv[0], encoding="latin-1")
        female = pd.read_csv(argv[1], encoding="latin-1")
        out_path = argv[2]
    model = {"male": train(prepare(male)), "female": train(prepare(female))}
    for sex, parts in model.items():
        for part, m in parts.items():
            print(f"{sex:6s} {part:10s} MAE {m['mae_cm']:5.2f}cm  ±{m['std_cm']:.2f}")
    if out_path:
        with open(out_path, "w") as f:
            json.dump(model, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main(sys.argv[1:])
