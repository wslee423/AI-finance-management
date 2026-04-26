# product-specs/04-dashboard.md — 재정 대시보드 스펙

> Phase 3 스펙. 기존 대시보드 수준의 시각화를 웹에서 구현.
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
│ (테이블)           │ Owner / Spouse   │
└────────────────────┴──────────────────┘
```

---

## 2. KPI 카드 4개

```typescript
interface KpiCard {
  label: string        // '총수입'
  value: number
  format: 'currency'   // '₩X,XXX,XXX'
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
interface MonthlyData {
  month: string      // 'YYYY-MM'
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

**API**: `GET /api/dashboard/monthly-summary?from=YYYY-MM&to=YYYY-MM`

---

## 4. 지출 카테고리 비율 (도넛 차트)

```typescript
interface CategoryBreakdown {
  category: string    // '변동지출'
  amount: number
  ratio: number       // 0.XXX
  subcategories: {
    name: string
    amount: number
  }[]
}

// 차트 설정
- 3개 섹터: 변동지출 / 고정지출 / 기타지출
- 클릭 시 subcategory 상세 테이블 표시
- 우측 테이블: 카테고리별 금액 내림차순 정렬
```

---

## 5. 순자산 성장 그래프 (스택 영역 차트)

```typescript
interface NetWorthSnapshot {
  date: string          // 'YYYY-MM-DD'
  realestate: number    // 부동산 합계
  stocks: number        // 통장(주식) 합계
  pension: number       // 연금 합계
  savings: number       // 예적금 합계
  others: number        // 기타 합계
  loans: number         // 대출 (음수)
  netWorth: number      // 순자산 합계
}

// 차트 설정
- X축: 월 (데이터 시작 ~ 현재)
- Y축: 금액 (억 단위)
- 스택 영역: 부동산/통장/연금/예적금/기타 (각기 다른 색상)
- 대출: 음수 영역으로 표시
- 최상단 선: 순자산 총합
```

**API**: `GET /api/dashboard/networth-history`

---

## 6. 월별 저축률 추이 (선 차트)

```typescript
// 차트 설정
- X축: 월
- Y축: 저축률 % (0~100)
- 실선: 실제 저축률
- 점선: 목표 저축률 (환경변수 또는 설정에서 관리)
- 목표 미달 구간: 빨간색 하이라이트
- 이동 평균선 (3개월): 회색 점선
```

---

## 7. 저축 vs 투자 기여도 (연도별 테이블)

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
| YYYY | X.XX억 | XX.XX% | +X.XX억 | X.XX억 | +X.XX억 |
| YYYY | X.XX억 | XX.XX% | +X.XX억 | X.XX억 | +X.XX억 |

> 실제 데이터는 DB 집계로 자동 계산됨.

---

## 8. 배당금 분석 섹션

### 8-1. 연도별 배당금 비교 (그룹 막대)
```typescript
// X축: 월 (1~12)
// 각 연도별 색상으로 그룹 막대
```

### 8-2. 누적 배당금 (선 차트)
```typescript
// X축: 월
// Y축: 누적 배당금 (원화)
// 연도별 선으로 비교
// 목표선: 월 배당금 목표 달성 시점 하이라이트
```

### 8-3. 배당금 피봇 테이블 (월 × 연도)

| 월 | YYYY | YYYY | YYYY | YYYY |
|----|------|------|------|------|
| 1월 | — | XXX | XXX | XXX |
| ... | | | | |
| 합계 | XXX | X,XXX,XXX | XX,XXX,XXX | (진행중) |

> 실제 데이터는 DB 집계로 자동 계산됨.

### 8-4. 배당금 성장 KPI 테이블

| 연도 | 월평균 배당금 | 총 배당금 | 전년대비 |
|------|------------|---------|---------|
| YYYY | XXX,XXX | X,XXX,XXX | — |
| YYYY | XXX,XXX | XX,XXX,XXX | +XXX% |

**API**: `GET /api/dashboard/dividend-summary?groupBy=year`

---

## 9. 최근 5개월 자산 현황 테이블

```typescript
interface RecentAssets {
  assetName: string           // '아파트', '주식통장'
  months: {
    date: string
    balance: number
  }[]
}
```

| 자산 | MM월 | MM월 | MM월 | MM월 | MM월 |
|------|------|------|-----|-----|-----|
| [아파트] | X.XX억 | X.XX억 | X.XX억 | X.XX억 | X.XX억 |
| [증권사A] | X.XX억 | X.XX억 | X.XX억 | X.XX억 | X.XX억 |
| ... | | | | | |
| **합계** | **XX.XX억** | **XX.XX억** | **XX.XX억** | **XX.XX억** | **XX.XX억** |

> 실제 데이터는 DB 집계로 자동 계산됨.

---

## 10. 개인별 순자산 (Owner / Spouse)

```typescript
interface PersonalNetWorth {
  owner: 'Owner' | 'Spouse'
  breakdown: {
    category: string    // '통장' | '연금' | '기타'
    balance: number
  }[]
  total: number
}
```

| | Owner | Spouse |
|--|------|------|
| 통장 | X,XXX,XXX | X,XXX,XXX |
| 부동산 | X,XXX,XXX | — |
| 연금 | X,XXX,XXX | X,XXX,XXX |
| 기타 | X,XXX | X,XXX |
| **합계** | **X,XXX,XXX,XXX** | **XXX,XXX,XXX** |

> 공동 자산(부동산 등)은 contribution_rate에 따라 각자 지분으로 분리 계산.

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
