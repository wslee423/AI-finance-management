# product-specs/04-dashboard.md — 재정 대시보드 스펙

> Phase 3 스펙. Looker Studio PDF 수준의 시각화를 웹에서 구현.
> 모든 차트는 Recharts 기반. 기간 필터는 전 차트에 공통 적용.

---

## 1. 전체 레이아웃

```
[기간 선택: 전체 | 2022 | 2023 | 2024 | 2025 | 2026 | 커스텀 ▾]

┌──────┬──────┬──────┬──────────┐
│ 총수입│ 총지출│ 저축률│ 총배당금  │  ← KPI 카드 4개
└──────┴──────┴──────┴──────────┘

┌────────────────────┬──────────────────┐
│ 월별 수입 vs 지출   │ 지출 카테고리 비율 │
│ (막대+선 복합)      │ (도넛 차트)       │
└────────────────────┴──────────────────┘

┌─────────────────────────────────────────┐
│ 순자산 성장 그래프 (스택 영역 차트)       │
└─────────────────────────────────────────┘

┌────────────────────┬──────────────────┐
│ 월별 저축률 추이    │ 저축 vs 투자 기여 │
│ (선 차트 + 목표선)  │ (연도별 테이블)   │
└────────────────────┴──────────────────┘

┌─────────────────────────────────────────┐
│ 배당금 분석 섹션                         │
│  연도별 배당금 비교 (그룹 막대)           │
│  누적 배당금 (선 차트)                   │
│  배당금 피봇 테이블 (월×연도)            │
└─────────────────────────────────────────┘

┌────────────────────┬──────────────────┐
│ 최근 5개월 자산 현황│ 개인별 순자산     │
│ (테이블)           │ 운섭 / 아름       │
└────────────────────┴──────────────────┘
```

---

## 2. KPI 카드 4개

```typescript
// 각 카드 구조
interface KpiCard {
  label: string        // '총수입'
  value: number        // 993905632
  format: 'currency'   // '₩993,905,632'
  subLabel?: string    // '선택 기간 기준'
  trend?: {
    value: number      // 전년 대비 증감률
    direction: 'up' | 'down'
  }
}
```

| 카드 | 계산 | 비고 |
|------|------|------|
| 총수입 | `sum(amount) where class_type='수입'` | 기간 필터 적용 |
| 총지출 | `sum(amount) where class_type='지출'` | 기간 필터 적용 |
| 저축률 | `(총수입 - 총지출) / 총수입 × 100` | 소수점 2자리 |
| 총배당금 | `sum(krw_amount) from dividend` | 기간 필터 적용 |

---

## 3. 월별 수입 vs 지출 (복합 차트)

```typescript
// 데이터 구조
interface MonthlyData {
  month: string      // '2026-03'
  income: number     // 수입 합계
  expense: number    // 지출 합계
  savings: number    // income - expense
}

// 차트 설정
- X축: 월 (YYYY년 M월)
- Y축: 금액 (억 단위 표기: 1억, 1.5억)
- 수입: 파란색 막대
- 지출: 빨간색 막대
- 저축액: 초록색 선 (우측 Y축)
- Tooltip: 수입/지출/저축액/저축률 표시
```

**API**: `GET /api/dashboard/monthly-summary?from=2022-05&to=2026-03`

```typescript
// 응답
{
  data: MonthlyData[]
  total: { income, expense, savingsRate }
}
```

---

## 4. 지출 카테고리 비율 (도넛 차트)

```typescript
// 데이터 구조
interface CategoryBreakdown {
  category: string    // '변동지출'
  amount: number
  ratio: number       // 0.501 (50.1%)
  subcategories: {
    name: string
    amount: number
  }[]
}

// 차트 설정
- 3개 섹터: 변동지출(50.1%), 고정지출(40.7%), 기타지출(9.2%)
- 클릭 시 subcategory 상세 테이블 표시
- 우측 테이블: 카테고리별 금액 내림차순 정렬
```

**구글시트 대시보드 "지출 항목별" 테이블 재현:**

| 순위 | 카테고리 | 금액 |
|------|---------|------|
| 1 | 기타 | 37,694,833 |
| 2 | 관리비 | 35,582,550 |
| 3 | 마트/편의점 | 15,465,929 |
| ... | ... | ... |

---

## 5. 순자산 성장 그래프 (스택 영역 차트)

```typescript
// 데이터 구조
interface NetWorthSnapshot {
  date: string          // '2026-03-31'
  realestate: number    // 부동산 합계
  stocks: number        // 통장(주식) 합계
  pension: number       // 연금 합계
  savings: number       // 예적금 합계
  others: number        // 기타 합계
  loans: number         // 대출 (음수)
  netWorth: number      // 순자산 합계
}

// 차트 설정
- X축: 월 (2022-05 ~ 현재)
- Y축: 금액 (억 단위)
- 스택 영역: 부동산/통장/연금/예적금/기타 (각기 다른 색상)
- 대출: 음수 영역으로 표시
- 최상단 선: 순자산 총합
- Tooltip: 각 자산 유형별 금액 + 순자산 합계
```

**API**: `GET /api/dashboard/networth-history`

---

## 6. 월별 저축률 추이 (선 차트)

```typescript
// 차트 설정
- X축: 월
- Y축: 저축률 % (0~100)
- 실선: 실제 저축률
- 점선: KPI 목표 저축률 (기본값: 70%)
- 목표 미달 구간: 빨간색 하이라이트
- 이동 평균선 (3개월): 회색 점선
```

---

## 7. 저축 vs 투자 기여도 (연도별 테이블)

구글시트 대시보드 "저축 자산기여도 VS 투자 자산기여도" 재현.

```typescript
interface YearlyContribution {
  year: string               // '2024년'
  endNetWorth: number        // 연말 순자산
  growthRate: number         // 자산 증가율 (YOY)
  totalChange: number        // 자산 변동분
  pureSavings: number        // 순수저축액 (수입-지출)
  investmentGain: number     // 투자 평가손익 추정 (변동분 - 저축액)
}
```

| 연도 | 연말 순자산 | 증가율 | 변동분 | 순수저축액 | 투자손익 |
|------|-----------|-------|-------|----------|---------|
| 2023 | 8.26억 | 41.33% | +2.41억 | 1.85억 | +0.57억 |
| 2024 | 12.77억 | 54.71% | +4.52억 | 1.96억 | +2.56억 |
| 2025 | 17.04억 | 33.42% | +4.27억 | 1.08억 | +3.18억 |
| 2026 | 20.37억 | 19.55% | +3.33억 | 2.15억 | +1.18억 |

---

## 8. 배당금 분석 섹션

### 8-1. 연도별 배당금 비교 (그룹 막대)
```typescript
// X축: 월 (1~12)
// 각 연도별 색상으로 그룹 막대
// 2023/2024/2025/2026 4개 연도 비교
```

### 8-2. 누적 배당금 (선 차트)
```typescript
// X축: 월
// Y축: 누적 배당금 (원화)
// 연도별 선으로 비교
// 목표선: 월 배당금 100만원 달성 시점 하이라이트
```

### 8-3. 배당금 피봇 테이블 (월 × 연도)

| 월 | 2023 | 2024 | 2025 | 2026 |
|----|------|------|------|------|
| 1월 | — | 45,517 | 62,966+16,416 | 35,490+13,185 |
| 2월 | — | 87,335 | 79,875+... | 73,320+... |
| 3월 | 351,685 | 1,189,241 | 37,625+... | 42,978+... |
| ... | | | | |
| 합계 | 1,955,256 | 11,278,747 | 17,067,809 | (진행중) |

### 8-4. 배당금 성장 KPI 테이블

| 연도 | 월평균 배당금 | 총 배당금 | 전년대비 |
|------|------------|---------|---------|
| 2023 | 279,322 | 1,955,256 | — |
| 2024 | 939,896 | 11,278,747 | +477% |
| 2025 | 1,422,317 | 17,067,809 | +51% |
| 2026 | (진행중) | | |

**API**: `GET /api/dashboard/dividend-summary?groupBy=year`

---

## 9. 최근 5개월 자산 현황 테이블

```typescript
// 구글시트 대시보드 "최근5개월 자산상세 현황표" 재현
interface RecentAssets {
  assetName: string           // '아파트', '주식통장'
  months: {
    date: string
    balance: number
  }[]
}
```

| 자산 | 11월 | 12월 | 1월 | 2월 | 3월 |
|------|------|------|-----|-----|-----|
| 아파트 | 9.65억 | 9.73억 | 10.2억 | 10.25억 | 10.35억 |
| 주식통장 | 6.75억 | 6.11억 | 6.18억 | 6.49억 | 6.58억 |
| ... | | | | | |
| **합계** | **16.76억** | **17.04억** | **19.56억** | **20.05억** | **20.37억** |

---

## 10. 개인별 순자산 (운섭 / 아름)

```typescript
interface PersonalNetWorth {
  owner: '운섭' | '아름'
  breakdown: {
    category: string    // '통장' | '연금' | '기타'
    balance: number
  }[]
  total: number
}
```

| | 운섭 | 아름 |
|--|------|------|
| 통장 | 935,193,472 | 24,699,169 |
| 부동산 | 300,000,000 | — |
| 연금 | 106,318,785 | 60,552,726 |
| 기타 | 35,100 | 1,974,800 |
| **합계** | **1,341,547,357** | **87,226,695** |

---

## 11. 기간 필터 동작

```typescript
type PeriodFilter =
  | { type: 'all' }
  | { type: 'year'; year: number }
  | { type: 'custom'; from: string; to: string }  // 'YYYY-MM'

// 필터 변경 시:
// 1. URL 파라미터 업데이트 (?period=2025)
// 2. 모든 API 동시 재조회 (React Query invalidate)
// 3. KPI 카드 + 모든 차트 일괄 업데이트
```

---

## 12. API 설계

```
GET /api/dashboard/kpi?from=YYYY-MM&to=YYYY-MM
GET /api/dashboard/monthly-summary?from=YYYY-MM&to=YYYY-MM
GET /api/dashboard/category-breakdown?from=YYYY-MM&to=YYYY-MM
GET /api/dashboard/networth-history
GET /api/dashboard/savings-rate?from=YYYY-MM&to=YYYY-MM
GET /api/dashboard/yearly-contribution
GET /api/dashboard/dividend-summary
GET /api/dashboard/recent-assets?months=5
GET /api/dashboard/personal-networth
```

모든 API: 인증 필수, 캐싱 적용 (`Cache-Control: max-age=300`)
