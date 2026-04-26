# CLAUDE.md — 희온이네 AI 재정 비서 에이전트 컨텍스트

> Claude Code가 매 세션 자동으로 읽는 핵심 컨텍스트.

---

## 세션 시작 시 읽을 문서 (순서대로)

1. `CONSTITUTION.md` — 최상위 원칙 (항상)
2. `AGENTS.md` — 에이전트 역할 및 자율 범위
3. `PLANS.md` — 현재 Phase 및 다음 작업
4. `exec-plans/NEXT_SESSION.md` — 이전 세션 핸드오프 (있으면)

---

## 프로젝트 개요

운섭·아름 가족의 가계부·자산·배당 데이터를 기반으로 AI가 재정 질의응답과 시각화 대시보드를 제공하는 가족 전용 웹 서비스.

| 역할 | 기술 |
|------|------|
| Framework | Next.js 15 App Router |
| Language | TypeScript strict |
| DB / Auth | Supabase (PostgreSQL + Auth + RLS) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| 차트 | Recharts |
| 배포 | Vercel (Pro 플랜 — Cron Job 필요) |
| 텔레그램 | node-telegram-bot-api |

---

## 핵심 명령어

```bash
npm run dev
npm run typecheck   # 매 작업 후 반드시 실행
npm run lint        # 매 작업 후 반드시 실행
npm run test
```

---

## Critical Rules

**Must Follow**
- TypeScript strict 모드 — `any` 사용 금지
- 모든 DB 테이블 RLS 활성화 (운섭·아름만 접근 가능)
- **금융 데이터 soft delete만** — `.delete()` 직접 실행 금지
- 모든 API Route 인증 확인 (미인증 → 401)
- AI 에이전트 = 생활 비서 — 투자·세무 질문 시에만 면책 문구 1줄
- 빈 catch 블록 금지 (조용한 실패 금지)
- typecheck + lint 통과 후 커밋

**Must NOT Do**
- 외부 패키지 무단 추가
- DB 스키마 무단 변경 (마이그레이션 파일 작성은 가능, 적용은 운섭 승인 필요)
- transactions / assets / dividend hard delete
- 허용 이메일 외 사용자 접근 허용
- AI 에이전트 역할 임의 변경
- `as SomeType[]` 강제 캐스팅 — Supabase 자동생성 타입 사용

**핵심 파일 (테스트 없이 수정 금지)**
```
lib/supabase/server.ts
lib/anthropic/tools.ts
lib/anthropic/prompts.ts
app/api/chat/route.ts
```

---

## 도메인 컨텍스트

```
[가족 구성]
- 운섭: 주 소득자, 넥슨 재직, 주식·ETF 투자
- 아름: 육아휴직 중 (2025.01~), 연금저축·ISA 보유
- 희온: 2025년 1월생 자녀

[자산 구조 (2026.03 기준)]
- 순자산: 약 20.4억
- 부동산: 신정1단지 10.35억 + 전세보증금 3억
- 주식통장: 약 6.58억 (KB증권)
- 연금: 약 1.62억
- 월 배당금: 약 142만원

[지출 분류]
- 고정지출: 보험, 용돈, 관리비, 구독, 통신비, 교통
- 변동지출: 마트/외식/의류/여가/병원 등
- 기타지출: 경조사, 기타
```

---

## 파일 구조 (프로젝트 생성 후 실제 경로)

```
/                           ← Next.js 프로젝트 루트
├── CONSTITUTION.md
├── CLAUDE.md
├── AGENTS.md
├── QUALITY_SCORE.md
├── PLANS.md
├── ARCHITECTURE.md
├── open-decisions.md
├── product-specs/
│   ├── 01-db-schema.md
│   ├── 02-admin-data-entry.md
│   ├── 03-backup.md
│   ├── 04-dashboard.md
│   └── 05-ai-agent.md
├── exec-plans/
│   └── NEXT_SESSION.md
├── app/
├── components/
├── lib/
└── types/
```

> 현재는 기획 단계로 docs 폴더 별도. 프로젝트 생성 후 루트로 이동 예정.

---

## 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # 서버 전용
ANTHROPIC_API_KEY=                  # 서버 전용
TELEGRAM_BOT_TOKEN=                 # 서버 전용
TELEGRAM_ALLOWED_CHAT_IDS=          # 허용 chat_id (콤마 구분)
CRON_SECRET=                        # Vercel Cron 인증용
GOOGLE_SERVICE_ACCOUNT_JSON=        # 구글 서비스 계정 JSON
BACKUP_SPREADSHEET_ID=              # 백업 구글시트 ID
```
