# open-decisions.md — 미결 의사결정

---

## 활성 항목 요약

| ID | 우선순위 | 항목 | 상태 |
|----|---------|------|------|
| OD-001 | 🔴 Blocker | 구글시트 기존 데이터 마이그레이션 방식 | ✅ 완료 |
| OD-002 | 🟠 High | 배당금 환율 기준 처리 방식 | ✅ 완료 |
| OD-003 | 🟡 Medium | 구글시트 역할 재정의 | ✅ 완료 |
| OD-004 | 🟡 Medium | 텔레그램 봇 대화 히스토리 저장 여부 | ✅ 완료 |
| OD-005 | 🟢 Low | 아파트 자산 기여도 관리 방식 | ✅ 완료 |

---

## 상세

### OD-001: 구글시트 기존 데이터 마이그레이션 방식
**우선순위**: 🔴 Blocker | **상태**: ✅ 완료

**결정**: 1회성 Node.js 스크립트로 일괄 마이그레이션
- 과거 데이터(2022.05~현재)는 스크립트로 일괄 import
- 이후 신규 데이터는 웹 Admin에서만 입력
- 중복 방지: `date + amount + category + user_name` 조합으로 upsert

---

### OD-002: 배당금 환율 기준 처리 방식
**우선순위**: 🟠 High | **상태**: ✅ 완료 | **결정일**: 2026-04-26

**결정**: B — 환율 API 자동 조회
- 사용 API: `exchangerate-api.com` 무료 tier (월 1,500회, 배당금 입력 빈도 대비 충분)
- 입력 날짜 기준 USD/KRW 환율 자동 조회 → 원화금액 자동 계산
- 사용자가 수동으로 수정 가능 (자동 조회값이 기본값)
- 구현 위치: `app/api/dividend/exchange-rate/route.ts`
- 환경변수: `EXCHANGE_RATE_API_KEY` (Phase 2 전 설정 필요)

---

### OD-003: 구글시트 역할 재정의
**우선순위**: 🟡 Medium | **상태**: ✅ 완료

**결정**: 구글시트는 "원본 장부"가 아닌 "월말 자동 백업 아카이브"로 역할 전환
- Source of Truth: Supabase
- 구글시트: 월 1회 자동 export 데이터만 append (직접 편집 금지)
- CONSTITUTION 원칙 4, PLANS.md Phase 2에 반영 완료

---

### OD-004: 텔레그램 봇 대화 히스토리 저장 여부
**우선순위**: 🟡 Medium | **상태**: ✅ 완료 | **결정일**: 2026-04-26

**결정**: B (하이브리드) — Supabase DB 저장 + 토큰 비용 제한
- 대화 로그는 Supabase에 저장 (웹+텔레그램 공통)
- API 호출 시에는 **직전 20개 메시지만** 포함 → 토큰 비용 상한 제어
- DB 저장 자체는 무료 (Supabase 무료 tier)
- AI 토큰 비용: 20개 상한 제한으로 대화 길어져도 비용 급증 없음
- 구현 위치: `lib/anthropic/agent.ts` (history slice 로직)
- 저장 테이블: `ai_conversations`, `ai_messages` (Phase 5 때 추가)

---

### OD-005: 아파트 자산 기여도 관리 방식
**우선순위**: 🟢 Low | **상태**: ✅ 완료

**결정**: assets 테이블에 `contribution_rate` 컬럼 추가
- 운섭 기여분 = balance × contribution_rate
- 아름 기여분 = balance × (1 − contribution_rate)
- 신정1단지 기준: 운섭 75.89% (459,800,000 / 605,000,000)
- product-specs/01-db-schema.md assets 테이블에 반영 완료
