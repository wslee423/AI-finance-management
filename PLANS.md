# PLANS.md — AI Finance Management 개발 로드맵

> 매 세션 시작 시 현재 위치 확인용. Phase Gate 통과 후 다음 Phase 진입.

---

## 목표

3개월 내 MVP. 운섭·아름이 구글시트 대신 웹에서 가계부를 입력하고, AI에게 재정 질문을 할 수 있는 상태.

---

## Phase 구조

| Phase | 이름 | 기간 | 상태 |
|-------|------|------|------|
| Phase 1 | 기반 세팅 | 2주 | 🔲 |
| Phase 2 | 데이터 관리 (Admin) | 3주 | 🔲 |
| Phase 3 | 재정 대시보드 | 3주 | 🔲 |
| Phase 4 | AI 재정 에이전트 | 3주 | 🔲 |
| Phase 5 | 텔레그램 봇 | 2주 | 🔲 |
| Phase 6 | 안정화 | 상시 | 🔲 |

상태: 🔲 미시작 / 🔄 진행 중 / ✅ 완료

---

## Phase 1 — 기반 세팅

**Phase Gate (모두 통과해야 Phase 2 진입 가능)**
- [ ] Next.js 프로젝트 생성 + Vercel 배포 확인
- [ ] Supabase 프로젝트 생성 + 환경변수 연결
- [ ] 4개 테이블 스키마 생성 (transactions, assets, dividend, preset_templates)
- [ ] RLS 정책 + updated_at 트리거 적용
- [ ] Supabase Auth 설정 (운섭·아름 이메일 whitelist, 신규 가입 차단)
- [ ] 로그인/로그아웃 기본 동작 확인
- [ ] `npm run typecheck && npm run lint` 경고 0건

**작업 목록**
- [ ] Next.js 15 App Router + TypeScript strict 초기화
- [ ] Tailwind CSS 설정
- [ ] Supabase client 설정 (server/client 분리 — `lib/supabase/server.ts`, `lib/supabase/client.ts`)
- [ ] DB 스키마 마이그레이션 (`product-specs/01-db-schema.md` 기준)
- [ ] 인증 미들웨어 (미인증 → `/login` 리다이렉트)
- [ ] 기본 레이아웃 (사이드바 + 헤더)

---

## Phase 2 — 데이터 관리 (Admin)

**Phase Gate**
- [ ] 수입/지출 CRUD 동작 (단건 입력, 수정, soft delete)
- [ ] 고정지출 preset 불러오기 → 일괄 저장 동작
- [ ] 자산 월별 스냅샷 입력 (직전 월 불러오기 + 저장)
- [ ] 배당금 입력 동작
- [ ] 마이그레이션 스크립트 실행 완료 (기존 구글시트 데이터 → Supabase)
- [ ] 월말 자동 백업 스크립트 동작 (Vercel Cron → 구글시트 append)
- [ ] 모바일 뷰에서 기본 입력 가능
- [ ] `npm run typecheck && npm run lint` 경고 0건

**작업 목록**
- [ ] 수입/지출 입력 폼 + 목록 페이지 (`/admin/transactions`)
- [ ] 고정지출 preset 불러오기 (체크박스 선택 → 일괄 insert)
- [ ] 자산 스냅샷 입력 페이지 (`/admin/assets`)
- [ ] 배당금 입력 페이지 (`/admin/dividend`) — OD-002 결정 후 환율 처리 확정
- [ ] 고정지출 템플릿 관리 (`/admin/presets`)
- [ ] 1회성 마이그레이션 스크립트 (구글시트 CSV → Supabase, upsert 방식)
- [ ] 월말 자동 백업 (Vercel Cron `0 15 1 * *` UTC → 구글시트 append)
  - 텔레그램 알림은 Phase 5 완료 후 추가. Phase 2에서는 이메일 또는 로그로 대체.

---

## Phase 3 — 재정 대시보드

**Phase Gate**
- [ ] KPI 카드 4개 기간 필터 적용 (총수입, 총지출, 저축률, 총배당금)
- [ ] 핵심 차트 5개 실데이터 렌더링 (월별 수입/지출, 저축률, 순자산, 지출 도넛, 배당금)
- [ ] 저축 vs 투자 기여도 테이블
- [ ] 개인별 순자산 (운섭/아름 분리)
- [ ] 기간 필터 (전체/연도/커스텀)
- [ ] 반응형 레이아웃

**작업 목록**
- [ ] 대시보드 API 9개 (`/api/dashboard/*` — `product-specs/04-dashboard.md` §12 기준)
- [ ] KPI 카드 컴포넌트
- [ ] Recharts 차트 컴포넌트 7종
- [ ] 기간 필터 컴포넌트 (URL 파라미터 연동)
- [ ] 최근 5개월 자산 테이블
- [ ] 개인별 순자산 섹션

---

## Phase 4 — AI 재정 에이전트

**Phase Gate**
- [ ] 채팅 UI 스트리밍 응답 동작
- [ ] Tool use 4종 동작 검증
  - [ ] "지난달 외식비 얼마야?" → 정확한 금액 반환
  - [ ] "올해 경조사 내역 보여줘" → 목록 반환
  - [ ] "배당금 월 100만원 목표까지 얼마나 남았어?" → 계산 후 답변
- [ ] 면책 문구 조건부 적용 확인 (데이터 조회 시 없음, 투자 질문 시 1줄 추가)
- [ ] 데이터 없는 기간 질문 시 "데이터가 없어요" 응답 확인

**작업 목록**
- [ ] 채팅 UI 컴포넌트 (`/chat`)
- [ ] `/api/chat` Route (Anthropic API + SSE 스트리밍)
- [ ] Tool use 4종: `query_transactions`, `query_assets`, `query_dividend`, `calculate_summary`
- [ ] 시스템 프롬프트 (`lib/anthropic/prompts.ts`)
- [ ] Tool use 처리 루프 (`lib/anthropic/agent.ts`)

---

## Phase 5 — 텔레그램 봇

**Phase Gate**
- [ ] 텔레그램 메시지 → AI 답변 왕복 동작
- [ ] 운섭·아름 chat_id 인증 동작
- [ ] Phase 2 백업 스크립트에 텔레그램 알림 추가 완료

**작업 목록**
- [ ] Telegram Bot 생성 (BotFather)
- [ ] Webhook 엔드포인트 (`/api/telegram`)
- [ ] 허용 chat_id 인증
- [ ] 웹 AI Agent와 공통 로직 공유 (`lib/anthropic/agent.ts`)
- [ ] Phase 2 백업 스크립트 텔레그램 알림 연결

---

## Phase 6 — 안정화

**작업 목록**
- [ ] 에러 모니터링 설정 (Sentry 또는 Vercel Log Drains)
- [ ] Supabase 자동 백업 주기 확인 (프로젝트 설정)
- [ ] AI 에이전트 프롬프트 품질 개선 (실사용 후 튜닝)
- [ ] 연간 재정 리포트 자동 생성 검토

---

## 개발 원칙

1. **데이터 무결성 우선** — 잘못된 데이터보다 기능이 없는 게 낫다
2. **Phase Gate 엄수** — 완료 조건 미달 시 다음 Phase 진입 금지
3. **두 사람만을 위한 UX** — 일반 사용자 고려 불필요, 편의성 우선
