-- ============================================================
-- user_name을 null 허용으로 수정
-- ============================================================
-- transactions 테이블의 user_name은 이미 NOT NULL이 아니므로 nullable
-- 하지만 명시적으로 CHECK 제약을 수정하여 null 값을 명시적으로 허용

-- CHECK 제약은 (user_name IS NULL) OR (user_name IN (...)) 형태로 이미 null을 허용함
-- PostgreSQL의 CHECK 제약에서 null 값은 제약을 무시하기 때문

-- 확인 쿼리: null 값이 저장 가능한지 테스트
-- INSERT INTO transactions (date, class, type, user_name, amount)
-- VALUES (NOW()::date, '지출', '변동지출', NULL, 10000);
