# NEXT_SESSION.md — 다음 세션 핸드오프

## 🔖 현재 상태

**현재 Phase**: 기획 완성 + Repository Harness 완료 → **Phase 1 구현 시작 가능**

**이번 세션 완료:**
- ✅ OD-002: 환율 API 자동 조회 결정 (exchangerate-api.com)
- ✅ OD-004: 텔레그램 대화 히스토리 DB 저장 결정 (하이브리드, 20개 상한)
- ✅ WORKFLOW.md 생성 (Feature 분류, 재시도 전략, Git 커밋 규칙)
- ✅ .claude/settings.json 생성 (허용/차단 명령 정의)
- ✅ .claude/commands/orchestrate.md 생성
- ✅ .claude/commands/review.md 생성
- ✅ .claude/commands/sync-docs.md 생성
- ✅ MIGRATION.md 생성 (컬럼 매핑, 중복 방지, 검증 체크리스트)
- ✅ scripts/migrate.ts 생성 (Transactions 3,075건 / Assets 819건 / Dividend 196건)
- ✅ .env.example 생성 (모든 환경변수 템플릿)
- ✅ tech-debt.md 생성 (TD-001~003 등록)

**오픈 의사결정:** 없음 (전체 완료)

---

## 🚀 다음 할 것: Phase 1 실제 구현

### 순서 (PLANS.md Phase 1 기준)

**Step 1: Next.js 프로젝트 생성**
```bash
npx create-next-app@latest heeone-finance \
  --typescript --tailwind --app --src-dir=false \
  --import-alias '@/*'
cd heeone-finance
```

**Step 2: 필수 패키지 설치**
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install xlsx                  # 마이그레이션 스크립트용
npm install -D tsx                # TypeScript 스크립트 실행
```

**Step 3: Supabase 프로젝트 생성**
- https://supabase.com 에서 신규 프로젝트 생성
- 프로젝트명: `heeone-finance`
- 리전: Northeast Asia (Seoul)
- .env.local 에 SUPABASE URL + ANON_KEY 설정

**Step 4: DB 스키마 적용 (Owner 승인 후)**
- product-specs/01-db-schema.md 기준 SQL 실행
- Supabase SQL Editor에서 실행:
  1. transactions 테이블
  2. assets 테이블
  3. dividend 테이블
  4. preset_templates 테이블
  5. backup_logs 테이블
  6. RLS 정책 (is_allowed_user 함수 + 4가지 정책)
  7. updated_at 트리거

**Step 5: Supabase Auth 설정**
- Authentication > Providers > Email 활성화
- Authentication > URL Configuration > Site URL 설정
- 신규 가입 차단 (Sign-ups disabled)
- Owner·Spouse 계정 수동 생성

**Step 6: Next.js Supabase 연결**
- lib/supabase/client.ts 생성
- lib/supabase/server.ts 생성
- middleware.ts 생성 (인증 미들웨어)

**Step 7: 로그인 페이지**
- app/(auth)/login/page.tsx

**Step 8: 기본 레이아웃**
- app/(dashboard)/layout.tsx (사이드바 + 헤더)
- app/(dashboard)/page.tsx (대시보드 placeholder)

---

## ❓ Phase 1 시작 전 Owner가 준비해야 할 것

1. **Supabase 프로젝트 생성** → URL + ANON_KEY + SERVICE_ROLE_KEY 확보
2. **Owner·Spouse 이메일 확인** → RLS `is_allowed_user()` 함수에 넣을 이메일
3. **Vercel 계정 연결** → 나중에 배포 시 필요
4. **.env.local 파일 생성** → .env.example 기준으로 작성

---

## 📋 Phase 1 완료 조건 체크

```
□ Next.js 프로젝트 생성 + Vercel 배포 확인
□ Supabase 프로젝트 생성 + 환경변수 연결
□ 5개 테이블 스키마 생성 (transactions, assets, dividend, preset_templates, backup_logs)
□ RLS 정책 + updated_at 트리거 적용
□ Supabase Auth 설정 (Owner·Spouse 이메일 whitelist)
□ 로그인/로그아웃 기본 동작 확인
□ 미인증 → /login 리다이렉트 동작 확인
□ npm run typecheck && npm run lint 경고 0건
```

**세션 업데이트**: 2026-04-26
