-- AST 데이터 스키마 (Supabase / PostgreSQL)
-- 관계: 원단 1 : 옷 N (물성 재사용), 옷 1 : 사이즈 N, 도매상품 1 : 소매상품 N (후속)

create table fabrics (
  id            uuid primary key default gen_random_uuid(),
  knit          boolean not null,
  composition   jsonb not null,            -- [{"fiber":"면","pct":95}, ...]
  elastane_pct  numeric not null default 0,
  thickness_mm  numeric,
  gsm           numeric,                   -- g/m² 근사
  stretch_weft  numeric,                   -- 0.05 = 5%
  stretch_warp  numeric,
  drape_deg     numeric,                   -- 간이 캔틸레버 처짐 각도
  source        text not null check (source in ('measured','estimated')),
  based_on      uuid[],                    -- 추정이면 근거 원단 id
  created_at    timestamptz default now()
);

create table garments (
  id            uuid primary key default gen_random_uuid(),
  brand         text,
  name          text not null,
  category      text not null default 'top',
  intended_fit  text check (intended_fit in ('slim','regular','semi-over','oversized')),
  fabric_id     uuid references fabrics(id),
  wholesale_id  text,                      -- 후속: 도매 상품 식별자
  photo_urls    text[],
  created_at    timestamptz default now()
);

create table garment_sizes (
  id             uuid primary key default gen_random_uuid(),
  garment_id     uuid not null references garments(id) on delete cascade,
  label          text not null,            -- S/M/L/FREE
  total_length   numeric not null,
  shoulder       numeric not null,
  chest_half     numeric not null,
  waist_half     numeric,
  hem_half       numeric,
  sleeve_length  numeric not null,
  armhole        numeric,
  sleeve_width   numeric,
  measured_by    text[],                   -- 교차 측정자 2인
  measure_minutes numeric,                 -- 1벌 측정 소요 시간 (사업성 근거)
  unique (garment_id, label)
);

create table body_profiles (
  id          uuid primary key default gen_random_uuid(),
  nickname    text not null,               -- 시연용 팀원 이름
  sex         text check (sex in ('male','female')),
  height_cm   numeric not null,
  weight_kg   numeric not null,
  measured    jsonb default '{}'::jsonb,   -- 줄자로 잰 부위만 {"chest":96,...}
  created_at  timestamptz default now()
);

-- 검증용: 실제 착용 사진에서 잰 값 vs 예측값
create table validations (
  id            uuid primary key default gen_random_uuid(),
  body_id       uuid references body_profiles(id),
  size_id       uuid references garment_sizes(id),
  photo_url     text,
  actual        jsonb,                     -- {"shoulderDropCm":..,"sleeveEndCm":..,"hemFromWaistCm":..,"felt_grade":"regular"}
  predicted     jsonb
);
