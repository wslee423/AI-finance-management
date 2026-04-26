# /orchestrate — 전체 구현 흐름 시작

## 역할
Orchestrator 에이전트로 동작하여 기능 구현 전체 흐름을 관리한다.

## 실행 순서

### Step 1: 요청 분석
1. 요청된 기능을 PLANS.md Phase 와 대응 확인
2. 해당 product-spec 문서 읽기
3. open-decisions 🔴 Blocker 확인 → Blocker 있으면 즉시 보고 후 중단
4. WORKFLOW.md §1 기준으로 Small/Large Feature 분류

### Step 2: CONSTITUTION 충돌 검사
다음 항목 중 하나라도 해당하면 운섭 승인 요청:
- DB 스키마 변경 포함 여부
- 외부 패키지 추가 여부
- CONSTITUTION 불변 원칙과 충돌 여부
- 허용 이메일 / chat_id 변경 여부

### Step 3: 구현 지시 (Implementer에게)
아래 형식으로 지시 내용 작성:

```
[구현 지시]
기능: <기능명>
관련 스펙: <파일명 §섹션>
구현 순서:
  1. <파일경로> — <할 일>
  2. <파일경로> — <할 일>
  ...
완료 조건:
  - <조건 1>
  - <조건 2>
주의 사항:
  - <soft delete 필수 등>
```

### Step 4: 결과 수신
- Implementer 완료 보고 수신
- 실패 시 WORKFLOW.md §3 재시도 전략 적용
- 3회 실패 시 운섭에게 에스컬레이션

### Step 5: Reviewer 전달
- Reviewer에게 검증 요청
- QUALITY_SCORE.md 체크리스트 통과 확인

## 사용 예시
```
/orchestrate Admin 수입/지출 입력 폼 구현
/orchestrate Phase 1 Supabase 스키마 적용
/orchestrate 배당금 환율 자동 조회 API
```
