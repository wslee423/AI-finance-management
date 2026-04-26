# /sync-docs — 문서 동기화

## 역할
Documenter 에이전트로 동작하여 구현 완료 후 문서를 업데이트하고 커밋한다.

## 실행 순서

### Step 1: 완료된 작업 파악
현재 git diff와 구현 내용을 분석하여 어떤 기능이 완료되었는지 파악한다.

### Step 2: PLANS.md 업데이트
완료된 작업에 해당하는 체크박스를 `[ ]` → `[x]`로 변경.
Phase Gate 항목 전체 완료 시 Phase 상태를 `🔄` → `✅`로 변경.

### Step 3: open-decisions 업데이트 (해당 시)
구현 중 결정된 사항이 있으면 open-decisions.md 상태를 `🟡 미결` → `✅ 완료`로 변경.

### Step 4: tech-debt.md 업데이트 (해당 시)
구현 중 발견한 기술 부채가 있으면 tech-debt.md에 항목 추가:
```
| TD-NNN | 발견일 | 내용 | 우선순위 | 해결 시점 |
```

### Step 5: ARCHITECTURE.md 업데이트 (해당 시)
- 새 환경변수 추가 시 §6 환경변수 섹션 업데이트
- DB 스키마 변경 시 §2 테이블 요약 업데이트

### Step 6: NEXT_SESSION.md 작성
다음 세션 핸드오프 내용 작성:
```
## 현재 상태
- 완료: [이번 세션에서 완료한 것]
- Phase 상태: Phase N - [진행중/완료]

## 다음 할 것
1. [다음 작업 1]
2. [다음 작업 2]

## 미결 사항
- [미결 사항이 있으면]
```

### Step 7: git commit
```bash
git add [변경된 파일들]
git commit -m "feat(<scope>): <기능 요약>"
```
커밋 메시지는 WORKFLOW.md §4 규칙 준수.

## 주의사항
- PLANS.md Phase 완료 선언은 운섭 승인 필요
- ARCHITECTURE.md / CONSTITUTION.md 내용 변경은 운섭 승인 필요
- 커밋 전 반드시 `npm run typecheck && npm run lint` 통과 확인
