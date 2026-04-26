# WORKFLOW.md — 희온이네 AI 재정 비서 개발 워크플로우

> AGENTS.md에서 참조하는 작업 분류 기준 및 실행 절차 정의.

---

## 1. Feature 크기 분류 기준

| 구분 | Small Feature | Large Feature |
|------|--------------|---------------|
| 파일 변경 범위 | 1~3개 파일 | 4개 이상 파일 |
| DB 스키마 변경 | 없음 | 있음 (운섭 승인 필요) |
| 외부 패키지 추가 | 없음 | 있음 (운섭 승인 필요) |
| 예상 구현 시간 | < 2시간 | 2시간 이상 |
| Orchestrator 관여 | 직접 완료 가능 | Implementer 에게 위임 |

**Small Feature 예시:**
- 기존 API Route 에 필드 추가
- UI 컴포넌트 스타일 수정
- 에러 메시지 문구 변경
- 환경변수 추가

**Large Feature 예시:**
- 새 Admin 페이지 전체 구현 (DB → API → UI)
- AI Tool use 신규 추가
- 월말 백업 스크립트 전체 구현
- 대시보드 차트 신규 추가

---

## 2. 표준 구현 순서

기능 하나를 구현할 때 항상 이 순서를 따른다:

```
1. product-spec 확인 (해당 Phase 스펙 문서)
2. open-decisions 🔴 Blocker 없음 확인
3. DB 스키마 / 마이그레이션 파일 작성  ← 운섭 승인 후 적용
4. TypeScript 타입 정의 (/types/index.ts)
5. API Route 구현 (/app/api/*)
6. UI 컴포넌트 구현 (/components/*, /app/*)
7. 연결 + 통합 확인
8. 엣지 케이스 처리
9. npm run typecheck && npm run lint (경고 0건)
10. QUALITY_SCORE.md 체크리스트 확인
```

---

## 3. 재시도 전략

```
1회차 실패
  → Implementer 자동 재시도 (에러 메시지 분석 후)

2회차 실패
  → Implementer 접근 방식 변경 후 재시도

3회차 실패
  → 에스컬레이션: 운섭에게 보고
  → 보고 내용: 실패 원인, 시도한 방법 2가지, 운섭 결정 필요 사항
```

---

## 4. Git 커밋 메시지 규칙

```
<type>(<scope>): <subject>

type:
  feat     — 새 기능 추가
  fix      — 버그 수정
  refactor — 기능 변경 없는 코드 개선
  test     — 테스트 추가/수정
  docs     — 문서 수정
  chore    — 빌드 설정, 패키지 등

scope (선택):
  db, api, ui, auth, ai, backup, telegram, migration

subject:
  한국어 또는 영어, 50자 이하, 명령형

예시:
  feat(db): transactions 테이블 스키마 + RLS 적용
  feat(api): /api/transactions CRUD 구현
  feat(ui): Admin 수입/지출 입력 폼 구현
  fix(api): soft delete 시 deleted_at null 처리 오류 수정
  docs: PLANS.md Phase 1 완료 체크박스 업데이트
```

---

## 5. 브랜치 전략

```
main         — 배포 가능한 상태 (Vercel 자동 배포)
feat/*       — 기능 개발 브랜치
fix/*        — 버그 수정 브랜치
```

Phase 단위로 브랜치 분리:
```
feat/phase1-foundation
feat/phase2-admin
feat/phase3-dashboard
feat/phase4-ai-agent
feat/phase5-telegram
```

---

## 6. 세션 시작/종료 루틴

### 세션 시작
```
1. NEXT_SESSION.md 읽기 (이전 세션 핸드오프 확인)
2. PLANS.md 현재 Phase 확인
3. open-decisions 🔴 Blocker 확인
4. 작업 시작
```

### 세션 종료
```
1. npm run typecheck && npm run lint 통과 확인
2. PLANS.md 완료 항목 체크박스 업데이트
3. open-decisions 변경 사항 업데이트
4. NEXT_SESSION.md 다음 세션 핸드오프 작성
5. git commit
```

---

## 7. 코드 리뷰 기준 (QUALITY_SCORE.md 요약)

Reviewer가 `/review` 실행 시 반드시 확인하는 항목:

```
□ typecheck 경고 0건
□ lint 경고 0건
□ 삭제 API가 soft delete 방식
□ 조회 쿼리에 deleted_at IS NULL 필터
□ 모든 API Route 인증 확인 코드
□ 서버 전용 환경변수 클라이언트 노출 없음
□ 조용한 실패(빈 catch) 없음
```

---

## 8. 문서 동기화 규칙

| 변경 사항 | 업데이트 대상 |
|----------|-------------|
| Phase 작업 완료 | PLANS.md 체크박스 |
| DB 스키마 변경 | 01-db-schema.md + ARCHITECTURE.md |
| 새 환경변수 추가 | ARCHITECTURE.md §6 + .env.example |
| 의사결정 완료 | open-decisions.md 상태 변경 |
| 기술 부채 발견 | tech-debt.md 항목 추가 |
| 세션 종료 | NEXT_SESSION.md 업데이트 |
