# product-specs/05-ai-agent.md — AI 재정 에이전트 스펙

> Phase 4 (웹) + Phase 5 (텔레그램) 스펙.
> CONSTITUTION 원칙 3 이행: 생활 비서 역할, 조건부 면책 문구.

---

## 1. 에이전트 성격 정의

```
이름: 없음 (별칭 없이 자연스럽게)
역할: 가족의 재정 데이터를 가장 잘 아는 비서
톤:   친근하고 정확하게. 딱딱한 금융 용어보다 일상 언어 우선.
      숫자는 항상 콤마+원 표기 (X,XXX,XXX원)
      비율은 % 표기 (XX.X%)
```

**잘하는 것:**
- 특정 기간/카테고리/사람별 지출 조회 및 집계
- 자산 현황 파악 및 변화 추이 설명
- 배당금 현황 및 목표 달성 여부 확인
- 과거 특정 사건과 연결된 지출 기억 ("Child 100일 때 얼마 썼어?")
- 저축률·순자산 목표 대비 현황 파악

**하지 않는 것:**
- 특정 종목 매수/매도 직접 추천
- 세무 신고 방법 단언
- DB에 없는 정보 추측 답변

---

## 2. 시스템 프롬프트

```
당신은 가족의 AI 재정 비서입니다.
가족의 실제 가계부·자산·배당금 데이터를 기반으로 정확하고 친근하게 답변하세요.

[가족 구성]
- Owner : 주 소득자, 주식·ETF 투자 담당
- Spouse: 육아휴직 중, 연금저축·ISA 보유
- Child : 영아 자녀

[자산 구조]
- 순자산, 부동산, 주식통장, 연금, 배당금 등 실제 DB 데이터 기반

[답변 원칙]
1. 데이터 기반으로만 답변한다. 없는 데이터는 "해당 데이터가 없어요"라고 말한다.
2. 금액은 콤마+원 표기. 큰 금액은 "약 X억 X천만원" 병기.
3. 질문이 애매하면 먼저 Tool로 데이터를 조회하고 맥락을 파악한 후 답변한다.
4. 투자 판단·세무 처리 등 전문 영역 질문에는 답변 말미에 딱 1줄 추가:
   "투자·세무 관련 최종 결정은 전문가와 확인하세요."
5. 일상적인 데이터 조회 질문에는 면책 문구 없이 자연스럽게 답한다.
```

---

## 3. Tool use 정의

### Tool 1: `query_transactions`
```typescript
{
  name: "query_transactions",
  description: "가계부 거래 내역을 조회합니다. 기간·카테고리·사용자별 필터링과 집계가 가능합니다.",
  input_schema: {
    type: "object",
    properties: {
      from:         { type: "string", description: "시작 날짜 (YYYY-MM-DD 또는 YYYY-MM)" },
      to:           { type: "string", description: "종료 날짜" },
      class_type:   { type: "string", enum: ["수입", "지출"] },
      category:     { type: "string", description: "카테고리 (고정지출, 변동지출, 기타지출, 주수입, 기타수입)" },
      subcategory:  { type: "string", description: "서브카테고리 (외식비, 보험, 경조사 등)" },
      user_name:    { type: "string", enum: ["Owner", "Spouse", "Child", "Shared"] },
      tags:         { type: "array", items: { type: "string" }, description: "태그 필터 (#육아 등)" },
      keyword:      { type: "string", description: "메모/항목명 키워드 검색" },
      aggregate:    { type: "string", enum: ["sum", "count", "avg", "list"], description: "집계 방식. list=상세 목록" },
      limit:        { type: "number", description: "list 조회 시 최대 건수 (기본 20)" },
    },
    required: ["from"]
  }
}
```

**예시 호출:**
```json
// "지난달 외식비 얼마야?"
{ "from": "2026-03", "to": "2026-03", "subcategory": "외식비", "aggregate": "sum" }

// "올해 Owner가 쓴 경조사 목록 보여줘"
{ "from": "2026-01", "class_type": "지출", "subcategory": "경조사", "user_name": "Owner", "aggregate": "list" }

// "Child 관련 지출 총얼마야?"
{ "from": "2025-01", "tags": ["#육아"], "aggregate": "sum" }
```

---

### Tool 2: `query_assets`
```typescript
{
  name: "query_assets",
  description: "자산 현황을 조회합니다. 특정 시점의 스냅샷 또는 기간별 추이를 조회할 수 있습니다.",
  input_schema: {
    type: "object",
    properties: {
      snapshot_date: { type: "string", description: "특정 월 (YYYY-MM). 없으면 최신 스냅샷" },
      owner:         { type: "string", enum: ["Owner", "Spouse", "Shared", "all"] },
      asset_type:    { type: "string", description: "부동산·통장·연금·예적금·기타·대출" },
      history:       { type: "boolean", description: "true면 전체 추이 조회" },
    }
  }
}
```

**예시 호출:**
```json
// "지금 우리 순자산 얼마야?"
{ "snapshot_date": "latest" }

// "Owner 연금 얼마 쌓였어?"
{ "owner": "Owner", "asset_type": "연금" }

// "아파트 가격 변화 보여줘"
{ "asset_type": "부동산", "history": true }
```

---

### Tool 3: `query_dividend`
```typescript
{
  name: "query_dividend",
  description: "배당금 현황을 조회합니다.",
  input_schema: {
    type: "object",
    properties: {
      from:         { type: "string" },
      to:           { type: "string" },
      ticker:       { type: "string", description: "특정 종목 티커 (SCHD, TLT, O 등)" },
      aggregate:    { type: "string", enum: ["monthly", "yearly", "total", "list"] },
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

// "월 배당금 100만원 목표까지 얼마나 남았어?"
{ "from": "2026-01", "aggregate": "monthly" }
```

---

### Tool 4: `calculate_summary`
```typescript
{
  name: "calculate_summary",
  description: "재정 지표를 계산합니다. 저축률, 증감률, 목표 달성률 등.",
  input_schema: {
    type: "object",
    properties: {
      metric: {
        type: "string",
        enum: [
          "savings_rate",           // 저축률
          "networth_growth",        // 순자산 증가율
          "dividend_target",        // 배당금 목표 달성률
          "expense_comparison",     // 기간 간 지출 비교
          "category_ratio",         // 카테고리별 지출 비율
        ]
      },
      params: { type: "object", description: "metric별 파라미터" }
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

[Tool call: query_transactions { from:"YYYY-MM", subcategory:"외식비", aggregate:"sum" }]
[결과: X건 / XXX,XXX원]

A: "지난달 외식비로 XXX,XXX원 쓰셨어요. 총 X번 외식하셨네요."
```

### 예시 2: 삶과 연결된 기억
```
Q: "Child 돌 즈음에 경조사 비용 얼마 썼어?"

[Tool call: query_transactions { from:"YYYY-MM", to:"YYYY-MM", subcategory:"경조사", aggregate:"list" }]

A: "Child 돌 전후 3개월간 경조사 비용을 정리해드릴게요.
   [DB 조회 결과 기반으로 답변]
   합계 XXX,XXX원이었어요."
```

### 예시 3: 재정 목표 현황
```
Q: "배당금 월 100만원 목표까지 얼마나 남았어?"

[Tool call: query_dividend { from:"YYYY-01", aggregate:"monthly" }]

A: "현재 월평균 배당금은 X,XXX,XXX원으로 목표를 달성하셨어요!
   연간 추이도 꾸준히 성장하고 있어요."
```

### 예시 4: 투자 관련 (면책 문구 포함)
```
Q: "SCHD 더 살까 TLT 더 살까?"

A: "현재 포트폴리오 배당금 기여도 기준으로 보면
   [DB 조회 결과 기반 분석]
   
   투자·세무 관련 최종 결정은 전문가와 확인하세요."
```

---

## 5. 웹 채팅 UI

```
/chat 페이지 구조:

┌─ AI 재정 비서 ────────────────────────────────┐
│                                                │
│  [빠른 질문]                                   │
│  💬 이번달 지출 요약   💬 현재 순자산           │
│  💬 배당금 현황        💬 저축률 확인           │
│                                                │
│  ─────────────────────────────────────────   │
│                                                │
│  🤖 안녕하세요! 재정 데이터에 대해              │
│     무엇이든 물어보세요.                        │
│                                                │
│  👤 지난달 외식비 얼마야?                       │
│                                                │
│  🤖 지난달 외식비는 XXX,XXX원이에요.            │
│     총 X번 외식하셨고...                        │
│                                                │
│  ────────────────────────────────────────    │
│  [메시지 입력...                        ] [전송]│
└────────────────────────────────────────────────┘
```

**UX 세부:**
- 빠른 질문 버튼 4개 (자주 쓰는 질문 고정)
- 메시지 스트리밍 출력 (타이핑 효과)
- Tool 호출 중 로딩 표시: "데이터 조회 중..."
- 숫자/표 포함 답변은 마크다운 렌더링
- 대화 히스토리: 세션 내 유지 (OD-004: DB 저장 + 20개 상한)

---

## 6. 텔레그램 봇 (Phase 5)

### 6-1. 설정
```
봇 이름: AI Finance Management
허용 chat_id: Owner + Spouse 2개만 (환경변수 TELEGRAM_ALLOWED_CHAT_IDS)
```

### 6-2. 명령어
```
/start   - 봇 소개 + 사용법
/summary - 이번달 재정 요약 (수입/지출/저축률)
/assets  - 현재 순자산 요약
/dividend- 이번달/올해 배당금
/help    - 자주 쓰는 질문 예시
```

### 6-3. 자연어 질문
명령어 없이 자연어로 질문하면 웹과 동일한 AI 에이전트가 응답.

### 6-4. Webhook 설정
```typescript
// app/api/telegram/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  const { message } = body

  // 허용 chat_id 확인
  const allowedIds = process.env.TELEGRAM_ALLOWED_CHAT_IDS!.split(',')
  if (!allowedIds.includes(String(message.chat.id))) {
    return Response.json({ ok: true })  // 무시 (에러 반환 안 함)
  }

  // 명령어 처리
  if (message.text.startsWith('/')) {
    return handleCommand(message)
  }

  // 자연어 → AI 에이전트 (웹과 공통 로직)
  const reply = await askAgent(message.text)
  await sendTelegramMessage(message.chat.id, reply)

  return Response.json({ ok: true })
}
```

### 6-5. 공통 에이전트 로직
```typescript
// lib/anthropic/agent.ts — 웹과 텔레그램이 공유

export async function askAgent(
  question: string,
  history: Message[] = []
): Promise<string> {
  // OD-004: 직전 20개 메시지만 포함 (토큰 비용 상한)
  const trimmedHistory = history.slice(-20)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      QUERY_TRANSACTIONS_TOOL,
      QUERY_ASSETS_TOOL,
      QUERY_DIVIDEND_TOOL,
      CALCULATE_SUMMARY_TOOL,
    ],
    messages: [...trimmedHistory, { role: 'user', content: question }],
  })

  return await handleToolUseLoop(response)
}
```

---

## 7. API 설계

```
POST /api/chat          ← 웹 채팅 (스트리밍)
  body: { message: string, history: Message[] }
  response: SSE stream

POST /api/telegram      ← 텔레그램 Webhook
  body: TelegramUpdate
  response: { ok: true }
```
