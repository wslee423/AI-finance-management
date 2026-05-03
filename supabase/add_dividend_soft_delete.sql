-- ============================================================
-- dividend 테이블에 soft delete 지원 추가
-- CLAUDE.md: transactions / assets / dividend hard delete 금지
-- ============================================================
ALTER TABLE dividend ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 기존 조회 쿼리에 deleted_at IS NULL 필터 추가 필요
-- app/api/dividend/route.ts GET, app/api/dividend/[id]/route.ts DELETE 참고
