# MIGRATION.md — 구글시트 → Supabase 마이그레이션

> Phase 2 작업. 1회성 스크립트. 기존 finance_table.xlsx 데이터를 Supabase로 이전.

---

## 1. 원본 데이터 현황

| 시트 | 행 수 | 기간 | 비고 |
|------|------|------|------|
| Transactions | 3,147행 | 2022.05 ~ 현재 | 이체(72행) 제외 후 3,075행 |
| assets | 819행 | 2022.05 ~ 현재 | 월말 스냅샷 |
| dividend | 196행 | 2023.06 ~ 현재 | USD/KRW 혼합 |

---

## 2. 컬럼 매핑

### 2-1. Transactions

| Excel 컬럼 | DB 컬럼 | 변환 규칙 |
|-----------|--------|---------|
| `date` | `date` | datetime → YYYY-MM-DD 문자열 |
| `class` | `class_type` | 수입/지출 그대로 / **이체는 제외** |
| `type` | `category` | '부수입' → '기타수입' 변환 |
| `category` | `subcategory` | 그대로 |
| `subcategory` | `item` | null 허용 |
| `item` | (item 앞에 추가) | subcategory가 없으면 item에 병합 |
| `amount` | `amount` | float → bigint (반올림) |
| `user` | `user_name` | trim() 후 ('운섭'/'아름'/'희온'/'공동') |
| `memo` | `memo` | null 허용 |
| `tags` | `tags` | 문자열 → text[] 변환 |

**제외 항목:**
- `class = '이체'` (= 저축/투자 이체): 72행 제외
- `user = ' 운섭'` (앞 공백): trim 후 '운섭'으로 정규화

**type 매핑:**
```
주수입    → 주수입
부수입    → 기타수입  ← 정규화
기타수입  → 기타수입
고정지출  → 고정지출
변동지출  → 변동지출
기타지출  → 기타지출
저축/투자 → 제외 (class='이체'와 동일 행)
```

---

### 2-2. assets

| Excel 컬럼 | DB 컬럼 | 변환 규칙 |
|-----------|--------|---------|
| `year`, `month` | `snapshot_date` | 해당 월의 마지막 날 계산 (예: 2022-05 → 2022-05-31) |
| `category` | `asset_type` | 그대로 (대출/부동산/예적금/통장/기타/연금) |
| `assettype` | `institution` | 자산 종류명 그대로 사용 |
| `institution` | (memo로 저장) | 실제 기관명 → memo 필드에 저장 |
| `balance` | `balance` | float → bigint (반올림) |
| `owner` | `owner` | 운섭/아름/공동 그대로 |

**snapshot_date 계산:**
```python
from calendar import monthrange
year, month = int(row['year']), int(row['month'])
last_day = monthrange(year, month)[1]
snapshot_date = f"{year:04d}-{month:02d}-{last_day:02d}"
```

---

### 2-3. dividend

| Excel 컬럼 | DB 컬럼 | 변환 규칙 |
|-----------|--------|---------|
| `date` | `date` | datetime → YYYY-MM-DD |
| `account` | `account` | null 허용 |
| `ticker` | `ticker_symbol` | 숫자(360750) → 문자열 변환 |
| `ticker_name` | `ticker_name` | 그대로 |
| `krw_dividend` | `krw_amount` | KRW 직접 배당일 경우 사용 |
| `usd_dividend` | `usd_amount` | null 허용 |
| `day_usd` | `exchange_rate` | float 그대로 |
| `krw_quivalent` | `krw_amount` | 최종 원화 금액 (usd × 환율 계산값) |

**krw_amount 우선순위:** `krw_quivalent` > `krw_dividend`

---

## 3. 중복 방지 (upsert 키)

| 테이블 | dedup 키 | 비고 |
|--------|---------|------|
| transactions | `date + amount + category + user_name` | 같은 날 같은 금액+카테고리+사용자 조합 |
| assets | `snapshot_date + asset_type + institution + owner` | 월별 자산 항목 |
| dividend | `date + ticker_symbol + usd_amount` | 날짜+종목+금액 |

---

## 4. 실행 방법

### 사전 준비
```bash
# 프로젝트 루트에서
cp .env.example .env.local
# .env.local에 SUPABASE 설정 입력 후

npm install
npx tsx scripts/migrate.ts --dry-run   # 실제 DB 변경 없이 검증만
npx tsx scripts/migrate.ts             # 실제 마이그레이션 실행
```

### 옵션
```bash
npx tsx scripts/migrate.ts --sheet=transactions  # 특정 시트만
npx tsx scripts/migrate.ts --sheet=assets
npx tsx scripts/migrate.ts --sheet=dividend
npx tsx scripts/migrate.ts --dry-run             # 검증 모드
```

---

## 5. 검증 체크리스트

마이그레이션 후 운섭이 직접 확인:

```
□ Supabase 대시보드 transactions 테이블 행수: 3,075건 ±5건
□ Supabase 대시보드 assets 테이블 행수: 819건
□ Supabase 대시보드 dividend 테이블 행수: 196건
□ 2026년 3월 수입 합계 = 기존 구글시트 2026-03 수입 합계
□ 2026년 3월 지출 합계 = 기존 구글시트 2026-03 지출 합계
□ 2026년 3월 순자산 = 기존 구글시트 2026-03 순자산
□ 최신 배당금 내역 일치
```

---

## 6. 롤백

마이그레이션 실패 시:
1. Supabase 대시보드 → Table Editor → 해당 테이블 전체 삭제
2. 스크립트 수정 후 재실행
3. 구글시트 원본 데이터는 변경되지 않으므로 언제든 재실행 가능
