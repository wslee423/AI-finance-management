# product-specs/05-ai-agent.md — AI 재정 에이전트 스펙

> Phase 4 (웹) + Phase 5 (텔레그램) 스펙.
> CONSTITUTION 원칙 3 이행: 생활 비서 역할, 조건부 면책 문구.

---

## 1. 에이전트 성격 정의

```
역할: 가족의 재정 데이터를 가장 잘 아는 비서
톤:   친근하고 정확하게. 딱딱한 금융 용어보다 일상 언어 우선.
      숫자는 항상 콤마+원 표기 (X,XXX,XXX원)
      비율은 % 표기 (XX.X%)
```

**잘하는 것:**
- 특정 기간/카테고리/사람별 지출 조회 및 집계
- 자산 현황 파악 및 변화 추이 설명
- 배당금 현황 및 목표 달성 여부 확인
- 저축률·순자산 목표 대비 현황 파악

**하지 않는 것:**
- 특정 종목 매수/매도 직접 추천
- 세무 신고 방법 단언
- DB에 없는 정보 추측 답변

---

## 2. 기술 스택

| 항목 | 값 |
|------|-----|
| SDK | OpenAI SDK (`openai` npm) |
| 모델 | `gpt-5.1` |
| 스트리밍 | SSE (Server-Sent Events) |
| Tool use | OpenAI function calling |
| 공통 로직 | `lib/openai/tools.ts`, `lib/openai/prompts.ts` |

---

## 3. Tool use 정의

### Tool 1: `query_transactions`

```typescript
{
  name: "query_transactions",
  description: "가계부 거래 내역을 조회합니다. 합계/건수/평균/목록 집계를 지원합니다.",
  parameters: {
    type: "object",
    properties: {
      from:         { type: "string", description: "시작 날짜 (YYYY-MM 또는 YYYY-MM-DD)" },
      to:           { type: "string", description: "종료 날짜. 미지정 시 오늘까지" },
      class_type:   { type: "string", enum: ["수입", "지출", "이체"], description: "거래 유형 (이체=저축/투자)" },
      category:     {
        type: "string",
        enum: ["보험", "용돈", "관리비", "통신비", "구독/멤버십", "마트/편의점", "외식비", "의류/미용", "여가비", "병원비", "경조사", "기타"],
        description: "지출 카테고리. 특정 카테고리 검색 시만 사용. 전체 지출 조회 시 생략."
      },
      subcategory:  { type: "string", description: "category 하위 세부 항목 (자유 입력). category 고정값과 중복 사용 금지." },
      user_name:    { type: "string", enum: ["운섭", "아름", "희온", "공동"], description: "가족 구성원" },
      tags:         { type: "string", description: "태그 키워드 검색 (예: #육아, #부동산). 쉼표 구분 문자열" },
      keyword:      { type: "string", description: "메모/항목명 키워드 검색" },
      aggregate:    { type: "string", enum: ["sum", "count", "avg", "list"], description: "집계 방식. 기본값: sum" },
      limit:        { type: "number", description: "list 조회 시 최대 건수. 최대 10 (기본값: 10)" },
    },
    required: ["from"]
  }
}
```

> **자동 재조회**: subcategory 결과 0건이면 Tool이 자동으로 keyword로 전환 재조회.

**예시 호출:**
```json
// "지난달 외식비 얼마야?"
{ "from": "2026-03", "to": "2026-03-31", "class_type": "지출", "category": "외식비", "aggregate": "sum" }

// "올해 운섭이 쓴 경조사 목록 보여줘"
{ "from": "2026-01", "class_type": "지출", "category": "경조사", "user_name": "운섭", "aggregate": "list" }

// "배달음식으로 얼마 썼어?"
{ "from": "2026-03", "category": "외식비", "keyword": "배달", "aggregate": "sum" }
```

---

### Tool 2: `query_assets`

```typescript
{
  name: "query_assets",
  description: "자산 현황을 조회합니다. 최신 스냅샷 또는 특정 시점/추이를 조회합니다.",
  parameters: {
    type: "object",
    properties: {
      snapshot_date: { type: "string", description: "조회할 월 (YYYY-MM). 미지정 시 최신 스냅샷" },
      owner:         { type: "string", enum: ["운섭", "아름", "공동", "all"], description: "소유자 필터. 기본: all" },
      asset_type:    { type: "string", enum: ["부동산", "통장", "연금", "예적금", "기타", "대출"], description: "자산 유형 필터" },
      history:       { type: "boolean", description: "true면 전체 추이 반환" },
    }
  }
}
```

**예시 호출:**
```json
// "지금 우리 순자산 얼마야?"
{ }

// "운섭 연금 얼마 쌓였어?"
{ "owner": "운섭", "asset_type": "연금" }

// "아파트 가격 변화 보여줘"
{ "asset_type": "부동산", "history": true }
```

---

### Tool 3: `query_dividend`

```typescript
{
  name: "query_dividend",
  description: "배당금 현황을 조회합니다.",
  parameters: {
    type: "object",
    properties: {
      from:      { type: "string", description: "시작 날짜 (YYYY-MM 또는 YYYY-MM-DD)" },
      to:        { type: "string", description: "종료 날짜" },
      ticker:    { type: "string", description: "종목 티커 (SCHD, TLT, O 등)" },
      aggregate: { type: "string", enum: ["monthly", "yearly", "total", "list"], description: "집계 방식. 기본값: total" },
    }
  }
}
```

**예시 호출:**
```json
// "올해 배당금 총 얼마야?"
{ "from": "2026-01", "aggregate": "total" }

// "SCHD에서 배당금 얼마 받았어?"
{ "ticker": "SCHD", "aggregate": "total" }

// "월별 배당금 추이 보여줘"
{ "from": "2026-01", "aggregate": "monthly" }
```

---

### Tool 4: `calculate_summary`

```typescript
{
  name: "calculate_summary",
  description: "재정 지표를 계산합니다. 저축률, 순자산 증가율, 배당금 목표 달성률, 지출 비교, 카테고리 비율.",
  parameters: {
    type: "object",
    properties: {
      metric: {
        type: "string",
        enum: ["savings_rate", "networth_growth", "dividend_target", "expense_comparison", "category_ratio"],
        description: "savings_rate=저축률, networth_growth=순자산증가율, dividend_target=배당목표달성률, expense_comparison=지출비교, category_ratio=카테고리비율"
      },
      params: {
        type: "object",
        description: "savings_rate/category_ratio: {from, to?}. networth_growth: {from_date?, to_date?}. dividend_target: {monthly_target?}. expense_comparison: {from, to?}"
      },
    },
    required: ["metric"]
  }
}
```

---

## 4. 대표 질의·응답 예시

### 예시 1: 일상 데이터 조회
```
Q: "지난달 외식비 얼마나 썼어?"

[Tool call: query_transactions { from:"2026-03", category:"외식비", aggregate:"sum" }]
[결과: 12건 / 179,300원]

A: "지난달 외식비로 179,300원 쓰셨어요. 총 12번 외식하셨네요."
```

### 예시 2: 세부 항목 검색
```
Q: "지난달 배달음식으로 얼마 썼어?"

[Tool call: query_transactions { from:"2026-02", category:"외식비", subcategory:"배달", aggregate:"sum" }]
→ 0건이면 Tool이 자동으로 keyword="배달"로 재조회
[결과: 3건 / 48,251원]

A: "지난달 배달음식으로 48,251원 쓰셨어요. 총 3건이에요."
```

### 예시 3: 재정 목표 현황
```
Q: "배당금 월 100만원 목표까지 얼마나 남았어?"

[Tool call: calculate_summary { metric:"dividend_target" }]

A: "현재 월평균 배당금은 X,XXX,XXX원으로 목표를 달성하셨어요!"
```

### 예시 4: 투자 관련 (면책 문구 포함)
```
Q: "SCHD 더 살까 TLT 더 살까?"

A: "현재 포트폴리오 배당금 기여도 기준으로 보면 [분석]
   
   투자·세무 관련 최종 결정은 전문가와 확인하세요."
```

---

## 5. 웹 채팅 UI

```
POST /api/chat
  body:     { message: string, history: { role: 'user'|'assistant', content: string }[] }
  response: SSE stream — { type: 'token'|'thinking'|'done'|'error', content?: string }
```

- SSE 스트리밍 출력 (타이핑 효과)
- Tool 호출 중 "데이터 조회 중..." 표시
- 대화 히스토리: 직전 20개 메시지 (OD-004)
- 마크다운 렌더링

---

## 6. 텔레그램 봇 (Phase 5)

### 설정
```
허용 chat_id: TELEGRAM_ALLOWED_CHAT_IDS (환경변수, 콤마 구분)
```

### 명령어
```
/start    — 봇 소개
/summary  — 이번달 재정 요약 (수입/지출/저축률)
/assets   — 현재 순자산 요약
/dividend — 이번달/올해 배당금
/help     — 자주 쓰는 질문 예시
```

### Webhook 엔드포인트
```typescript
// app/api/telegram/route.ts
export async function POST(request: Request) {
  const { message } = await request.json()

  const allowedIds = process.env.TELEGRAM_ALLOWED_CHAT_IDS!.split(',')
  if (!allowedIds.includes(String(message.chat.id))) {
    return Response.json({ ok: true })
  }

  if (message.text?.startsWith('/')) {
    return handleCommand(message)
  }

  const reply = await askAgent(message.text)
  await sendTelegramMessage(message.chat.id, reply)
  return Response.json({ ok: true })
}
```

### 공통 에이전트 로직
```typescript
// lib/openai/agent.ts — 웹과 텔레그램이 공유
export async function askAgent(question: string, history: HistoryMessage[] = []): Promise<string> {
  const messages = [
    { role: 'system', content: getSystemPrompt() },
    ...history.slice(-20),
    { role: 'user', content: question },
  ]
  // Tool use 루프 — app/api/chat/route.ts와 동일 로직
}
```

---

## 7. API 설계

```
POST /api/chat          ← 웹 채팅 (SSE 스트리밍)
POST /api/telegram      ← 텔레그램 Webhook
```
