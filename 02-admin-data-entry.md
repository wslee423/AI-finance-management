# product-specs/02-admin-data-entry.md — 데이터 입력 Admin (Phase 2)

> 웹 Admin이 유일한 데이터 입력 창구. 구글시트 대체.

---

## 1. 페이지 구조

```
/admin
  ├── /transactions     ← 수입/지출 입력 및 목록
  ├── /assets           ← 월별 자산 스냅샷 입력
  ├── /dividend         ← 배당금 입력
  └── /presets          ← 고정지출 템플릿 관리
```

---

## 2. 수입/지출 입력 (/admin/transactions)

### 2-1. 화면 구성

```
[상단] 기간 필터 (연/월 선택) + [새 항목 추가] 버튼
[중단] 입력 폼 (토글 방식 — 버튼 클릭 시 슬라이드 다운)
[하단] 목록 테이블 (최신순)
```

### 2-2. 입력 폼 필드

| 필드 | UI 컴포넌트 | 필수 | 기본값 | 비고 |
|------|-----------|------|--------|------|
| 날짜 | date picker | ✅ | 오늘 | |
| 분류 | 탭 선택 (수입/지출) | ✅ | 지출 | 선택에 따라 category 옵션 변경 |
| 카테고리 | select | ✅ | — | class_type 따라 동적 변경 |
| 세부카테고리 | select | — | — | category 따라 동적 변경 |
| 항목명 | text input | — | — | 자유 입력 |
| 사용자 | 버튼 그룹 | ✅ | 공동 | 운섭 / 아름 / 희온 / 공동 |
| 금액 | number input | ✅ | — | 원화, 천 단위 자동 콤마 |
| 메모 | text input | — | — | |
| 태그 | multi-select | — | — | #육아휴직, #주식매도 등 |

### 2-3. 고정지출 preset 불러오기

매달 고정지출 입력 시 템플릿을 한 번에 불러오는 기능.

```
[고정지출 불러오기] 버튼 클릭
  → preset_templates 목록 모달 표시
  → 사용자가 체크박스로 적용할 항목 선택 (기본: 전체 선택)
  → [적용] 클릭 → 선택된 항목 일괄 transactions에 삽입
  → 금액이 0인 항목(관리비 등)은 삽입 전 금액 입력 요구
```

### 2-4. 목록 테이블

| 컬럼 | 설명 |
|------|------|
| 날짜 | YYYY.MM.DD |
| 분류/카테고리 | 수입>주수입 형태 |
| 항목 | subcategory + item |
| 사용자 | 운섭/아름/희온/공동 |
| 금액 | 원화, 천 단위 콤마 |
| 메모 | 30자 truncate |
| 액션 | 수정 / 삭제(soft) |

- 월별 합계 행 표시 (수입 합계 / 지출 합계 / 저축액)
- 삭제 클릭 → 확인 모달 → `deleted_at = now()` 처리 (hard delete 아님)

---

## 3. 자산 스냅샷 입력 (/admin/assets)

### 3-1. 화면 구성

매월 말 자산 현황을 한 화면에서 일괄 입력.

```
[상단] 스냅샷 날짜 선택 (월말 기준) + 직전 월 데이터 불러오기 버튼
[중단] 자산 항목별 입력 테이블
[하단] 순자산 합계 실시간 표시
```

### 3-2. 직전 월 불러오기

```
[직전 월 불러오기] 버튼 클릭
  → 가장 최근 snapshot_date의 데이터를 폼에 채움
  → 사용자가 변경된 금액만 수정
  → [저장] 클릭 → 새 snapshot_date로 일괄 upsert
```

### 3-3. 입력 테이블 구성

```
자산 유형  |  기관명              | 소유자 | 금액
부동산     | 신정1단지            | 공동   | [__________]
부동산     | 전세(임차료)         | 공동   | [__________]
통장       | 미래에셋증권(주식)    | 운섭   | [__________]
통장       | 스톡옵션(엔카)       | 운섭   | [__________]
연금       | 퇴직금(DC)           | 운섭   | [__________]
연금       | ISA(개인저축계좌)    | 운섭   | [__________]
연금       | 연금저축             | 아름   | [__________]
통장       | CMA MMW              | 운섭   | [__________]
...
                                 순자산 합계: ₩ XX,XXX,XXX,XXX
```

- 각 행은 preset 항목 고정 (institution 추가/삭제는 /admin/presets에서)
- 아파트 기여도 비율은 별도 섹션에서 관리 (contribution_rate)

---

## 4. 배당금 입력 (/admin/dividend)

### 4-1. 입력 폼 필드

| 필드 | UI 컴포넌트 | 필수 | 비고 |
|------|-----------|------|------|
| 날짜 | date picker | ✅ | 실제 입금일 |
| 종목명 | select + 직접입력 | ✅ | 기존 ticker 목록 드롭다운 |
| 티커 심볼 | text input | — | SCHD, O, TLT 등 |
| 계좌 | text input | — | |
| USD 금액 | number input | — | 원화 배당이면 비워둠 |
| 환율 | number input | — | 자동 조회 or 수동 입력 |
| 원화금액 | number input | ✅ | USD × 환율 자동 계산, 수정 가능 |

> OD-002 반영: 환율 자동 조회 기능 추가 (입력 날짜 기준 환율 API 호출)

### 4-2. 목록 테이블

- 월별 배당금 합계 표시
- 종목별 필터
- 연도별 전환 탭

---

## 5. 고정지출 템플릿 관리 (/admin/presets)

### 5-1. 기능

- 템플릿 항목 추가 / 수정 / 비활성화 (삭제 아님)
- 드래그로 순서 변경 (sort_order 업데이트)
- 각 항목: 이름, 카테고리, 세부카테고리, 사용자, 금액, 활성여부

### 5-2. 비활성화 처리

`is_active = false` 처리. 목록에는 표시되나 preset 불러오기 시 제외.

---

## 6. 공통 UX 원칙

- **모바일 우선**: 운섭·아름이 스마트폰으로도 입력 가능해야 함. 폼 필드 최소 44px 터치 영역.
- **빠른 입력**: 고정지출은 preset 불러오기 1회 클릭 → 금액만 확인 후 저장.
- **실수 방지**: 삭제 시 반드시 확인 모달. hard delete 없음.
- **즉각 피드백**: 저장 성공/실패 토스트 메시지.
- **금액 표시**: 모든 금액은 천 단위 콤마 + ₩ 기호.

---

## 7. API 설계

### transactions CRUD

```
GET    /api/transactions?year=2026&month=3    ← 월별 목록
POST   /api/transactions                      ← 단건 생성
POST   /api/transactions/bulk                 ← preset 일괄 생성
PATCH  /api/transactions/[id]                 ← 수정
DELETE /api/transactions/[id]                 ← soft delete
```

### assets

```
GET    /api/assets?date=2026-03               ← 월별 조회
POST   /api/assets/bulk                       ← 월별 일괄 upsert
```

### dividend

```
GET    /api/dividend?year=2026                ← 연도별 목록
POST   /api/dividend                          ← 단건 생성
PATCH  /api/dividend/[id]
DELETE /api/dividend/[id]
```

---

## 8. Phase 2 완료 조건

- [ ] 수입/지출 CRUD 동작 (단건 입력, 수정, soft delete)
- [ ] 고정지출 preset 불러오기 기능 동작
- [ ] 자산 월별 스냅샷 직전 월 불러오기 + 일괄 저장 동작
- [ ] 배당금 입력 + 환율 자동 조회 동작
- [ ] 마이그레이션 스크립트 실행 완료 (기존 데이터 전량 Supabase 이전)
- [ ] 모바일 뷰에서 기본 입력 가능
- [ ] `npm run typecheck && npm run lint` 경고 0건
