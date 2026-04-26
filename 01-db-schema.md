# product-specs/01-db-schema.md — DB 스키마 & 인증

> Phase 1 핵심 스펙. 스키마 변경은 이 문서 업데이트 + 운섭 승인 필수.
> ARCHITECTURE.md의 테이블 요약과 이 문서의 SQL이 충돌할 경우 이 문서가 기준.

---

## 1. transactions (가계부 원장)

```sql
create table transactions (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  class_type    text not null check (class_type in ('수입', '지출')),
  category      text not null,
  subcategory   text,
  item          text,
  user_name     text check (user_name in ('운섭', '아름', '희온', '공동')),
  memo          text,
  amount        bigint not null check (amount > 0),  -- 원화, 항상 양수
  tags          text[],                               -- ex. '{#육아휴직, #주식매도}'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz                           -- soft delete. null = 유효
);

create index idx_tr_date     on transactions (date desc);
create index idx_tr_category on transactions (category, subcategory);
create index idx_tr_user     on transactions (user_name);
create index idx_tr_active   on transactions (deleted_at) where deleted_at is null;
```

**카테고리 기준값**

| class_type | category | subcategory 예시 |
|-----------|---------|----------------|
| 수입 | 주수입 | 월급, 성과금, 상여금 |
| 수입 | 기타수입 | 양육수당, 보험금, 당근판매 |
| 지출 | 고정지출 | 보험, 용돈, 관리비, 통신비, 구독/멤버십, 교통/차량 |
| 지출 | 변동지출 | 마트/편의점, 외식비, 의류/미용, 여가비, 병원비 |
| 지출 | 기타지출 | 경조사, 기타 |

---

## 2. assets (월별 자산 스냅샷)

```sql
create table assets (
  id                uuid primary key default gen_random_uuid(),
  snapshot_date     date not null,
  asset_type        text not null check (asset_type in ('부동산', '통장', '연금', '예적금', '기타', '대출')),
  institution       text not null,
  owner             text not null check (owner in ('운섭', '아름', '공동')),
  balance           bigint not null,  -- 원화. 대출은 음수로 기록.
  contribution_rate numeric(5,4),     -- 공동 자산의 운섭 기여 비율 (0~1). null = 단독 자산.
  created_at        timestamptz not null default now()
);

create index idx_assets_date  on assets (snapshot_date desc);
create index idx_assets_owner on assets (owner);
```

> **대출 처리**: `asset_type = '대출'`, `balance`는 음수. 별도 컬럼 없음.
> 순자산 = `SUM(balance)` (대출 음수가 자동 차감됨)

**institution 기준값**

| asset_type | institution 예시 |
|-----------|----------------|
| 부동산 | 신정1단지, 전세(임차료) |
| 통장 | KB증권(주식통장), CMA MMW(저축통장), 스톡옵션(엔카) |
| 연금 | 퇴직금(DC), 퇴직금(DB), 연금저축, ISA |
| 대출 | 부모님 대출 |

**아파트 기여도 예시** (2026.03):
- balance: 1,035,000,000 / contribution_rate: 0.7589
- 운섭 기여분: 1,035,000,000 × 0.7589 ≈ 785,455,500
- 아름 기여분: 1,035,000,000 × 0.2411 ≈ 249,544,500

---

## 3. dividend (배당금)

```sql
create table dividend (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  account         text,
  ticker_name     text not null,
  ticker_symbol   text,
  exchange_rate   numeric(10,2),   -- OD-002 결정 후 자동 조회 여부 확정
  usd_amount      numeric(14,4),   -- 원화 ETF는 null
  krw_amount      bigint not null,
  created_at      timestamptz not null default now()
);

create index idx_div_date   on dividend (date desc);
create index idx_div_ticker on dividend (ticker_symbol);
```

**주요 ticker 기준값**

| ticker_symbol | ticker_name | 유형 |
|-------------|-------------|-----|
| SCHD | SCHWAB US DIVIDEND ETF | USD |
| TLT | ISHARES 20+Y TREASURY BOND | USD |
| O | 리얼티인컴 | USD |
| QQQM | INVESCO NASDAQ 100 ETF | USD |
| SGOV | iShares 0-3 Month Treasury | USD |
| (없음) | TIGER 미국배당다우존스 | KRW |
| (없음) | TIGER 미국S&P500 | KRW |

---

## 4. preset_templates (고정지출 템플릿)

```sql
create table preset_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,     -- Admin UI 식별용 (ex. '실비보험/운섭')
  category      text not null default '고정지출',
  subcategory   text,
  item          text,
  user_name     text check (user_name in ('운섭', '아름', '희온', '공동')),
  memo          text,
  amount        bigint not null check (amount >= 0),  -- 0 허용 (관리비 등 매달 변동)
  sort_order    int default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

**초기 데이터** (2026.03 기준):

| name | subcategory | user | amount |
|------|------------|------|--------|
| 실비보험/운섭 | 보험 | 운섭 | 80,800 |
| 실비보험1/아름 | 보험 | 아름 | 74,745 |
| 실비보험2/아름 | 보험 | 아름 | 58,515 |
| 운전자보험/운섭 | 보험 | 운섭 | 12,397 |
| 태아보험(실비)/희온 | 보험 | 희온 | 25,400 |
| 태아보험(보장)/희온 | 보험 | 희온 | 35,000 |
| 용돈/운섭 | 용돈 | 운섭 | 100,000 |
| 용돈/아름 | 용돈 | 아름 | 200,000 |
| 아파트관리비 | 관리비 | 공동 | 0 |
| ChatGPT+Gemini+Claude | 구독/멤버십 | 공동 | 102,756 |
| 핸드폰요금 | 통신비 | 공동 | 33,890 |
| 하이패스 충전 | 교통/차량 | 공동 | 50,000 |
| 월세 | 관리비 | 공동 | 500,000 |
| 청호나이스 비데 | 관리비 | 공동 | 15,900 |
| 청호공기청정기렌탈 | 관리비 | 공동 | 22,900 |

---

## 5. backup_logs (월말 백업 실행 이력)

```sql
create table backup_logs (
  id             uuid primary key default gen_random_uuid(),
  backup_month   text not null,   -- 'YYYY-MM' (백업 대상 월)
  status         text not null check (status in ('success', 'failure')),
  transactions   int default 0,
  assets         int default 0,
  dividends      int default 0,
  error_message  text,
  executed_at    timestamptz not null default now()
);
```

---

## 6. RLS 정책

```sql
alter table transactions      enable row level security;
alter table assets            enable row level security;
alter table dividend          enable row level security;
alter table preset_templates  enable row level security;
alter table backup_logs       enable row level security;

-- 허용 사용자 확인 함수 (실제 이메일로 교체 필요)
create or replace function is_allowed_user()
returns boolean language sql security definer as $$
  select auth.email() = any(
    array['운섭이메일@gmail.com', '아름이메일@gmail.com']
  );
$$;

-- transactions 예시 — assets, dividend, preset_templates 동일 패턴
create policy "select_allowed" on transactions
  for select using (is_allowed_user() and deleted_at is null);
  -- RLS에서 deleted_at 필터 포함 → 앱 코드에서도 .is('deleted_at', null) 이중 방어
create policy "insert_allowed" on transactions
  for insert with check (is_allowed_user());
create policy "update_allowed" on transactions
  for update using (is_allowed_user());
-- DELETE 정책 없음 → hard delete 원천 차단
```

---

## 7. 트리거

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_transactions_updated_at
  before update on transactions
  for each row execute function set_updated_at();

create trigger trg_preset_updated_at
  before update on preset_templates
  for each row execute function set_updated_at();
```

---

## 8. TypeScript 타입 (`/types/index.ts`)

```typescript
export type ClassType = '수입' | '지출'
export type UserName  = '운섭' | '아름' | '희온' | '공동'
export type AssetType = '부동산' | '통장' | '연금' | '예적금' | '기타' | '대출'

export interface Transaction {
  id:           string        // uuid
  date:         string        // 'YYYY-MM-DD'
  class_type:   ClassType
  category:     string
  subcategory:  string | null
  item:         string | null
  user_name:    UserName
  memo:         string | null
  amount:       number
  tags:         string[] | null
  created_at:   string
  updated_at:   string
  deleted_at:   string | null
}

export interface Asset {
  id:                string    // uuid
  snapshot_date:     string    // 'YYYY-MM-DD'
  asset_type:        AssetType
  institution:       string
  owner:             UserName
  balance:           number    // 대출은 음수
  contribution_rate: number | null
  created_at:        string
}

export interface Dividend {
  id:             string
  date:           string
  account:        string | null
  ticker_name:    string
  ticker_symbol:  string | null
  exchange_rate:  number | null
  usd_amount:     number | null
  krw_amount:     number
  created_at:     string
}

export interface PresetTemplate {
  id:           string
  name:         string
  category:     string
  subcategory:  string | null
  item:         string | null
  user_name:    UserName
  memo:         string | null
  amount:       number
  sort_order:   number
  is_active:    boolean
}
```

> **타입 안전성**: `as Transaction[]` 강제 캐스팅 대신, Supabase CLI로 자동 생성한 DB 타입 사용 권장.
> `supabase gen types typescript --project-id <ID> > types/supabase.ts`
> 그 후 `Database['public']['Tables']['transactions']['Row']` 방식으로 활용.
