# /review — 품질 검증 단독 실행

## 역할
Reviewer 에이전트로 동작하여 QUALITY_SCORE.md 체크리스트를 순서대로 실행한다.

## 실행 순서

### Step 1: 정적 분석
```bash
npm run typecheck
npm run lint
```
경고가 있으면 Implementer에게 수정 요청.

### Step 2: 변경 파일 확인
```bash
git diff --name-only
git diff --staged --name-only
```
예상하지 못한 파일이 변경된 경우 운섭에게 보고.

### Step 3: 금융 데이터 무결성 검사 ← 이 서비스 핵심
변경된 파일을 읽고 다음을 확인:
- [ ] `.delete()` 직접 호출 없음 (soft delete 방식 사용 여부)
- [ ] 조회 쿼리에 `.is('deleted_at', null)` 필터 포함
- [ ] `amount <= 0` 거부 로직 존재 (해당 기능 시)
- [ ] 중복 입력 방지 로직 존재 (해당 기능 시)

### Step 4: 보안 검사
- [ ] 모든 API Route에 세션 확인 코드 (`supabase.auth.getSession()`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` 클라이언트 노출 없음
- [ ] `NEXT_PUBLIC_` 접두사 없는 변수가 클라이언트에서 사용되지 않는지 확인

### Step 5: 에러 처리 검사
- [ ] 빈 catch 블록 없음 (`catch (e) {}` 패턴 금지)
- [ ] 외부 API 호출에 에러 처리 존재 (Google Sheets, Telegram, Anthropic)
- [ ] AI Tool use 실패 시 사용자 친화적 메시지 반환

### Step 6: UI 상태 검사 (UI 변경 시)
- [ ] Loading / Success / Error / Empty 4가지 상태 처리
- [ ] Error 분기가 Success 뒤에 숨지 않음

### Step 7: AI 에이전트 검사 (AI 변경 시)
- [ ] 시스템 프롬프트에 역할 정의 포함
- [ ] 투자·세무 질문 시 면책 문구 1줄 포함
- [ ] 일반 데이터 조회에 면책 문구 없음

## 검증 결과 보고 형식
```
[검증 결과]
통과: O / 실패: X

Step 1 정적 분석: ✅ / ❌ (오류 내용)
Step 2 변경 파일: ✅ / ⚠️ (예상 외 파일: ...)
Step 3 금융 무결성: ✅ / ❌ (항목: ...)
Step 4 보안: ✅ / ❌
Step 5 에러 처리: ✅ / ❌
Step 6 UI 상태: ✅ / ❌ / 해당없음
Step 7 AI 에이전트: ✅ / ❌ / 해당없음

결론: PASS → Documenter 진행 / FAIL → Implementer 수정 요청
```
