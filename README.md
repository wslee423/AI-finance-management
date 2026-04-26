# AI Finance Management

가족의 가계부·자산·배당 데이터를 기반으로 AI가 자연어로 재정 분석·조회 및 생활 비서 역할을 하는 **자산관리 웹 서비스**.

구글시트로 관리하던 가계부를 Supabase로 이전하고, 대시보드 + AI 질의응답을 한 화면에서 제공한다.

---

## 기술 스택

| 역할 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| DB / Auth | Supabase (PostgreSQL + Auth + RLS) |
| AI | Anthropic Claude API (`claude-sonnet-4-5`) |
| 차트 | Recharts |
| 배포 | Vercel (Pro 플랜) |
| 텔레그램 | node-telegram-bot-api |

---

## 주요 기능

- **Admin** — 수입/지출/자산/배당금 웹 입력 (구글시트 대체)
- **Dashboard** — 순자산 성장, 저축률 추이, 배당금 분석 등 차트 10개+
- **AI 에이전트** — 자연어로 재정 질의응답 ("지난달 외식비 얼마야?")
- **텔레그램 봇** — 모바일에서 AI 에이전트 접근
- **월말 자동 백업** — Supabase → 구글시트 자동 export (Vercel Cron)

---

## 프로젝트 현황

| Phase | 이름 | 상태 |
|-------|------|------|
| Phase 1 | 기반 세팅 (Next.js + Supabase + Auth) | 🔲 준비 중 |
| Phase 2 | 데이터 관리 Admin + 마이그레이션 | 🔲 |
| Phase 3 | 재정 대시보드 | 🔲 |
| Phase 4 | AI 재정 에이전트 | 🔲 |
| Phase 5 | 텔레그램 봇 | 🔲 |
| Phase 6 | 안정화 | 🔲 |

---

## 문서 구조

```
├── CONSTITUTION.md          최상위 불변 원칙
├── CLAUDE.md                에이전트 세션 자동로드 컨텍스트
├── AGENTS.md                에이전트 역할 & 자율 범위
├── WORKFLOW.md              개발 워크플로우 (Feature 분류, 재시도, Git 규칙)
├── PLANS.md                 Phase별 개발 로드맵
├── QUALITY_SCORE.md         품질 검증 기준 (Reviewer 체크리스트)
├── ARCHITECTURE.md          기술 스택 & 폴더 구조
├── MIGRATION.md             구글시트 → Supabase 마이그레이션 가이드
├── open-decisions.md        의사결정 추적 (OD-001~005 완료)
├── tech-debt.md             기술 부채 추적
├── NEXT_SESSION.md          다음 세션 핸드오프
│
├── 01-db-schema.md          DB 스키마 & RLS & TypeScript 타입
├── 02-admin-data-entry.md   Admin 데이터 입력 UI 스펙
├── 03-backup.md             월말 자동 백업 스펙
├── 04-dashboard.md          재정 대시보드 스펙
├── 05-ai-agent.md           AI 재정 에이전트 스펙
│
├── scripts/
│   └── migrate.ts           구글시트 → Supabase 마이그레이션 스크립트
│
└── .claude/
    ├── settings.json        Claude Code 권한 설정
    └── commands/
        ├── orchestrate.md   /orchestrate 커맨드
        ├── review.md        /review 커맨드
        └── sync-docs.md     /sync-docs 커맨드
```

---

## 빠른 시작

### 환경 설정

```bash
cp .env.example .env.local
# .env.local에 Supabase, Anthropic, Telegram 등 설정
```

### 개발 서버

```bash
npm install
npm run dev
```

### 마이그레이션 (Phase 2)

```bash
# 검증 모드 (DB 변경 없음)
npx tsx scripts/migrate.ts --dry-run

# 실제 실행
npx tsx scripts/migrate.ts
```

---

## 핵심 원칙

1. **금융 데이터 무결성** — hard delete 금지, soft-delete(`deleted_at`)만 허용
2. **가족 전용 접근** — Owner·Spouse 두 사람만 (RLS + 이메일 whitelist)
3. **AI는 생활 비서** — 투자 자문 아님. 데이터 조회·분석에 집중
4. **Supabase = Source of Truth** — 구글시트는 월말 자동 백업 아카이브

---

## 에이전트 대화 예시

```
Q: "지난달 외식비 얼마나 썼어?"
A: "지난달 외식비로 XXX,XXX원 쓰셨어요. 총 X번 외식하셨고..."

Q: "배당금 월 100만원 목표까지 얼마나 남았어?"
A: "이미 달성하셨어요! 월평균 배당금이 목표를 초과달성 중이에요."

Q: "아이 관련 지출만 보여줘"
A: "Child 관련 지출을 조회해드릴게요..."
```
