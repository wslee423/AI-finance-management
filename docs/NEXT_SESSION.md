# NEXT_SESSION.md — 핸드오프 (2026-04-28)

> 이전 세션에서 완료한 내용 및 다음 세션 시작점.

---

## 현황

| Phase | 이름 | 상태 | 설명 |
|-------|------|------|------|
| Phase 1 | 기반 세팅 | ✅ | Next.js + Supabase 기반 완료 |
| Phase 2 | Admin 데이터 입력 | ✅ | 가계부/자산/배당금 입력 완료, 3,151건 마이그레이션 |
| Phase 3 | 재정 대시보드 | ✅ | KPI 카드, 차트, 태그별 지출 Top 10 완료 |
| Phase 4 | AI 재정 에이전트 | ✅ | 웹 채팅 UI + OpenAI (gpt-5.1) 완료 |
| Phase 5 | 텔레그램 봇 | ✅ | Webhook + AI 답변 + chat_id 인증 완료 |
| Phase 6 | 안정화 | 🔲 | **다음 단계** |

---

## Phase 5 완료 내용 (2026-04-28)

- `app/api/telegram/route.ts`: Webhook 엔드포인트
  - 허용 chat_id 인증 (TELEGRAM_ALLOWED_CHAT_IDS)
  - 빠른 명령어: /start, /summary, /assets, /dividend, /help
  - 자연어 질문 → AI 에이전트 응답
- `lib/openai/agent.ts`: 웹/텔레그램 공통 non-streaming 에이전트
- `lib/supabase/service.ts`: Service Role 클라이언트 (RLS 우회)
- `lib/openai/tools.ts`: executeToolCall에 serviceRole 옵션 추가

**AI 에이전트 개선 사항 (동일 세션):**
- category enum 강제 적용 (subcategory 오분류 방지)
- asset_type enum 추가
- subcategory 0건 시 keyword 자동 재조회
- `docs/specs/05-ai-agent.md` 전면 교정 (Anthropic→OpenAI, enum 정합성)

---

## 미완료 / 이월 항목

| 항목 | 상태 | Phase |
|------|------|-------|
| Spouse chat_id 추가 | 🔲 | .env.local + Vercel 환경변수 |
| 월말 자동 백업 스크립트 | 🔲 | Phase 6 |
| 백업 스크립트 텔레그램 알림 | 🔲 | Phase 6 |
| `any` 타입 (tools.ts) | 🔲 | Phase 6 |

---

## 다음 단계: Phase 6 (안정화)

**작업 목록:**
1. 월말 자동 백업 — Supabase → 구글시트 (Vercel Cron)
2. 백업 완료 시 텔레그램 알림
3. 에러 모니터링 (Sentry 또는 Vercel Log Drains)
4. AI 프롬프트 품질 개선 (실사용 후 튜닝)

**Spouse chat_id 추가 방법:**
```bash
# .env.local
TELEGRAM_ALLOWED_CHAT_IDS=7553686708,<spouse_chat_id>

# Vercel 환경변수도 동일하게 업데이트
```

---

## 환경 변수 현황

| 변수 | 상태 |
|------|------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ✅ |
| OPENAI_API_KEY | ✅ |
| TELEGRAM_BOT_TOKEN | ✅ |
| TELEGRAM_ALLOWED_CHAT_IDS | ✅ (Owner만) |
| GOOGLE_SERVICE_ACCOUNT_JSON | 🔲 Phase 6 |
| BACKUP_SPREADSHEET_ID | 🔲 Phase 6 |
| CRON_SECRET | 🔲 Phase 6 |
