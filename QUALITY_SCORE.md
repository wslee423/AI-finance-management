# QUALITY_SCORE.md — 희온이네 AI 재정 비서 품질 기준

> Core Layer `QUALITY_SCORE_BASE.md` + 금융 서비스 특화 기준 추가.
> Reviewer 에이전트가 `/review` 실행 시 이 체크리스트를 순서대로 확인한다.

---

## 1. 코드 품질

### 1-1. 정적 분석 (경고 0건)
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

### 1-2. 타입 안정성
- `any` 타입 사용 금지 — `/types/index.ts`의 타입 사용 필수
- Supabase 응답은 자동생성 타입 사용 권장 (`supabase gen types` 활용). 불가피한 경우 `as` 캐스팅 대신 `zod` validation 사용
- `null | undefined` 처리 명시 (optional chaining 필수)

### 1-3. 파일/함수 크기
| 항목 | 기준 |
|------|------|
| 단일 파일 | 300줄 이하 |
| 단일 함수/컴포넌트 | 50줄 이하 |
| API Route | 비즈니스 로직은 `/lib`으로 분리 |

---

## 2. 테스트

### 2-1. 필수 테스트 대상
| 대상 | 테스트 유형 | 기준 |
|------|-----------|------|
| Tool use 함수 (query_transactions 등) | 단위 테스트 | 필터 조합별 결과 검증 |
| preset 불러오기 → 일괄 저장 | 통합 테스트 | 중복 insert 방지 확인 |
| soft delete 동작 | 단위 테스트 | deleted_at 설정 확인, 조회 시 제외 확인 |
| 월말 백업 스크립트 | 통합 테스트 | 전월 데이터 export 건수 검증 |
| 대시보드 KPI 계산 | 단위 테스트 | 저축률·순자산 계산 로직 |

### 2-2. 테스트 커버리지
| 대상 | 기준 |
|------|------|
| `/lib/anthropic/` (Tool use 로직) | 70% 이상 |
| `/lib/backup/` (백업 스크립트) | 70% 이상 |
| `/lib/supabase/` (DB 쿼리) | 주요 쿼리 함수 |
| UI 컴포넌트 | 상태 반응성 테스트 1개 이상 |

---

## 3. 에러 처리

### 3-1. 조용한 실패 금지 (Core 원칙)
```typescript
// ❌ 금지
try { await saveTransaction(data) } catch (e) {}

// ✅ 필수
try {
  await saveTransaction(data)
} catch (error) {
  console.error('[saveTransaction] 실패:', error)
  throw new Error('거래 저장에 실패했습니다.')
}
```

### 3-2. AI 에이전트 에러 처리
```typescript
// Tool use 실패 시
if (toolError) {
  return "데이터 조회 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."
  // 에러 상세는 서버 로그에만 기록 (사용자에게 노출 금지)
}

// DB에 데이터 없을 때
return "해당 기간의 데이터가 없어요."  // 빈 결과 ≠ 에러
```

### 3-3. 백업 스크립트 에러
- 백업 실패 시 텔레그램으로 즉시 알림 필수
- `backup_logs` 테이블에 실패 이유 기록
- 다음날 수동 재실행 가능한 API 제공

---

## 4. 금융 데이터 무결성 (필수)

**CONSTITUTION 원칙 1 이행. 모든 기능에 적용.**

### 4-1. Soft Delete 검증
```typescript
// ✅ 올바른 삭제
await supabase
  .from('transactions')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id)

// ❌ Hard Delete — 절대 금지
await supabase.from('transactions').delete().eq('id', id)
```

Reviewer 체크:
- [ ] 코드 전체에서 `.delete()` 사용 없음
- [ ] 삭제 API Route가 `update({ deleted_at })` 방식인지 확인

### 4-2. 조회 시 deleted_at 필터
```typescript
// ✅ 항상 삭제된 데이터 제외
.from('transactions')
.select('*')
.is('deleted_at', null)   ← 누락 시 버그

// RLS에서도 이중 방어하지만 코드에서도 명시적으로 필터
```

### 4-3. amount 정합성
- amount는 항상 양수 bigint
- 수입/지출 구분은 `class_type`으로, 금액 자체는 음수 불가
- 입력 폼에서 음수 입력 방지 (`min=0`)
- API에서 `amount <= 0` 요청 거부 (400 반환)

### 4-4. 중복 입력 방지
- preset 불러오기 시 해당 월에 이미 고정지출 데이터 있으면 경고 표시
- 배당금 입력 시 동일 date + ticker 조합 중복 체크
- 마이그레이션 스크립트: upsert 방식 (중복 시 skip)

---

## 5. 보안

### 5-1. 인증
- [ ] 모든 API Route에 Supabase 세션 확인
  ```typescript
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- [ ] 미들웨어에서 `/admin/*`, `/chat`, `/api/*` 경로 인증 보호
- [ ] 텔레그램 Webhook: `TELEGRAM_ALLOWED_CHAT_IDS` 화이트리스트 확인

### 5-2. 환경변수 노출 방지
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — 서버 컴포넌트/API Route에서만 사용
- [ ] `ANTHROPIC_API_KEY` — 클라이언트 컴포넌트에서 직접 호출 금지
- [ ] `TELEGRAM_BOT_TOKEN` — 클라이언트 노출 금지
- [ ] `NEXT_PUBLIC_` 접두사 변수만 클라이언트에서 허용

### 5-3. RLS 검증
- [ ] Supabase 대시보드에서 모든 테이블 RLS 활성화 확인
- [ ] `is_allowed_user()` 함수가 실제 운섭·아름 이메일로 설정되어 있는지 확인
- [ ] 신규 테이블 생성 시 RLS 정책 즉시 추가 (생성 후 정책 추가 전 공백 금지)

### 5-4. AI 에이전트 보안
- [ ] 시스템 프롬프트에 개인 이메일·연락처 포함 금지
- [ ] Tool use 결과를 클라이언트에 raw JSON으로 반환 금지 (에이전트가 가공 후 응답)
- [ ] SQL injection 방어: 모든 쿼리는 Supabase 파라미터 바인딩 사용

---

## 6. UI 상태 머신

비동기 작업이 있는 모든 UI:

```typescript
// ✅ 3가지 상태 모두 도달 가능
if (error) return <ErrorMessage message={error} onRetry={retry} />
if (isLoading) return <Skeleton />
if (!data) return <EmptyState />
return <DataComponent data={data} />

// ❌ error가 success 뒤에 숨는 패턴 금지
if (data) return <DataComponent />
else if (error) return <ErrorMessage />  // data=null일 때만 도달
```

---

## 7. 성능 기준

| 항목 | 목표 | 측정 방법 |
|------|------|---------|
| 대시보드 초기 로딩 | < 2초 | Lighthouse |
| API 응답 시간 | < 500ms (p95) | Vercel Analytics |
| AI 에이전트 첫 토큰 | < 3초 | 클라이언트 측정 |
| 월말 백업 스크립트 | < 30초 | cron 실행 로그 |
| DB 쿼리 | N+1 없음 | Supabase 쿼리 로그 |

---

## 8. 검증 체크리스트 (기능 완료 시)

```
Step 1: 정적 분석
  □ npm run typecheck — 경고 0건
  □ npm run lint — 경고 0건
  □ git diff로 예상 파일만 변경됨 확인

Step 2: 금융 데이터 무결성 ← 이 서비스 핵심
  □ 삭제 API가 soft delete 방식인지 확인
  □ 조회 쿼리에 deleted_at IS NULL 필터 포함
  □ amount가 음수인 케이스 거부 로직 존재
  □ 중복 입력 방지 로직 존재 (해당 기능 시)

Step 3: 보안
  □ 모든 API Route 인증 확인 코드 존재
  □ 서버 전용 환경변수 클라이언트 노출 없음
  □ RLS 활성화 확인 (신규 테이블 시)
  □ 텔레그램 Webhook 허용 chat_id 검증 (해당 시)

Step 4: AI 에이전트 (해당 기능 시)
  □ 시스템 프롬프트에 역할 정의 포함
  □ Tool use 결과 기반 답변 (추측 없음)
  □ 투자·세무 질문 시 면책 문구 1줄 포함
  □ 일반 데이터 조회 답변에 면책 문구 없음

Step 5: 안정성
  □ 외부 호출(Google Sheets API, Telegram API)에 에러 처리 존재
  □ 조용한 실패(빈 catch) 없음
  □ AI Tool use 실패 시 사용자 친화적 메시지 반환

Step 6: UI 상태
  □ Loading / Success / Error / Empty 4가지 상태 처리
  □ Error 분기가 Success 뒤에 숨지 않음

Step 7: 문서
  □ PLANS.md 해당 항목 체크 완료
  □ open-decisions 관련 항목 처리
  □ tech-debt 등록 필요 항목 없는지 확인
```
