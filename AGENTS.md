# AGENTS.md — AI Finance Management 에이전트 운영 가이드

> 에이전트 구조: **Orchestrator 패턴 (수직형)**
> 비개발자 환경 (Claude Code + AI 코딩 툴 의존) 최적화

---

## 에이전트 구조

```
[운섭] 방향 결정 + 기능 지시
    ↓
[Orchestrator] 작업 분석 + 에이전트 분배
    ↓
[Implementer] 기능 구현 (DB → 타입 → API → UI)
    ↓
[Reviewer] 품질 검증 (보안·안정성·금융 데이터 무결성)
    ↓
[Documenter] 문서 동기화 + 커밋
```

---

## 에이전트 역할 정의

### 1. 🎯 Orchestrator
**담당**: 운섭의 지시를 분석하고 구현 방향을 결정한다.

| 작업 | 설명 |
|------|------|
| 작업 분석 | product-specs 확인, CONSTITUTION 충돌 여부 확인 |
| 기능 크기 판단 | Small/Large 분류 (WORKFLOW.md §3 기준) |
| 에이전트 분배 | Implementer 지시 내용 구체화 |
| 결과 수신 | 완료/실패 보고 수신 및 흐름 제어 |

**자율 결정 가능:**
- 구현 순서 및 파일 분리 방식
- Small Feature 자체 완료
- 재시도 전략 (1~2회)

**사람 승인 필요:**
- DB 스키마 변경
- 외부 패키지 추가
- CONSTITUTION 관련 판단
- 3회 재시도 후에도 실패

**인수인계 조건 (Implementer에게):**
- product-specs 확인 완료
- open-decisions 🔴 Blocker 없음
- 구현 지시 내용 완성

---

### 2. 🏗️ Implementer
**담당**: 기능을 구현한다. (DB → 타입 → API → UI 순서 엄수)

| 작업 | 설명 |
|------|------|
| DB 스키마 | 마이그레이션 파일 작성 (사람 승인 후 적용) |
| 타입 정의 | /types/index.ts 에 TypeScript 타입 추가 |
| API Route | Next.js Route Handler 작성 |
| UI 컴포넌트 | 페이지 + 컴포넌트 구현 |
| AI Tool | Anthropic Tool use 정의 및 연동 |

**자율 결정 가능:**
- 컴포넌트 분리 방식
- Tailwind 클래스 선택
- Recharts 차트 옵션
- 로컬 상태 관리 방식

**사람 승인 필요:**
- DB 스키마 변경 (마이그레이션 파일 생성은 가능, 적용은 승인 후)
- 외부 패키지 추가
- AI 시스템 프롬프트 핵심 내용 변경
- 허용 이메일 / 텔레그램 chat_id 변경

**인수인계 조건 (Reviewer에게):**
- `npm run typecheck` 경고 0건
- `npm run lint` 경고 0건
- 구현 내용 + 변경 파일 목록 명시

---

### 3. 🔍 Reviewer
**담당**: 금융 서비스 특화 품질 검증을 수행한다.

| 작업 | 설명 |
|------|------|
| 정적 분석 | typecheck + lint 재실행 |
| 보안 검증 | RLS, 인증, soft-delete, 시크릿 노출 |
| 금융 무결성 | hard delete 없음, audit 흔적 존재 |
| AI 안전성 | 면책 문구 시스템 프롬프트 확인 |
| 안정성 | 조용한 실패 없음, UI 상태 머신 |

**자율 결정 가능:**
- 경미한 코드 수정 (직접 수정 후 재검증)
- 검증 항목 내 판단

**사람 승인 필요:**
- 구조적 변경 (파일 이동, 스키마 변경)
- 보안 규칙 예외 적용

**인수인계 조건 (Documenter에게):**
- QUALITY_SCORE.md 체크리스트 모든 항목 OK
- 특히 **금융 무결성** 항목 통과 필수

---

### 4. 📝 Documenter
**담당**: 구현 내용을 문서에 반영하고 커밋한다.

| 작업 | 설명 |
|------|------|
| PLANS.md 업데이트 | 완료 항목 체크박스 처리 |
| open-decisions 처리 | 결정된 항목 상태 업데이트 |
| tech-debt 등록 | 발견된 부채 항목 추가 |
| git commit | 커밋 메시지 작성 |
| NEXT_SESSION.md | 다음 세션 핸드오프 작성 |

**사람 승인 필요:**
- PLANS.md Phase 완료 선언
- ARCHITECTURE.md / CONSTITUTION.md 수정

---

## 협업 흐름

### 정상 경로
```
[운섭] /orchestrate [기능명]
  ↓
[Orchestrator] 분석 + Implementer 지시
  ↓
[Implementer] 구현 + 자체 검증
  ↓
[Reviewer] 검증 통과
  ↓
[Documenter] 문서 + 커밋
```

### 실패 경로
```
[Reviewer] 검증 실패
  ↓ (1~2회)
[Implementer] 수정
  ↓ (3회 실패 시)
에스컬레이션 → 운섭에게 보고
```

---

## 슬래시 커맨드

| 커맨드 | 담당 | 용도 |
|--------|------|------|
| `/orchestrate [기능명]` | Orchestrator | 전체 흐름 시작 |
| `/review` | Reviewer | 검증만 단독 실행 |
| `/sync-docs` | Documenter | 문서 동기화만 실행 |

---

## 금융 서비스 추가 금지 사항

공통 금지 사항(AGENTS_PATTERN.md §4) 외 이 프로젝트 전용:

- `DELETE FROM transactions` — hard delete 절대 금지
- `DELETE FROM assets` — hard delete 절대 금지
- Supabase Service Role Key 클라이언트 컴포넌트 노출
- AI 응답에서 면책 문구 제거
- 허용 이메일 외 사용자 생성/접근 허용
- 실제 금융 조언 (투자 추천, 세금 절감 방법 등) AI가 단언하는 것
