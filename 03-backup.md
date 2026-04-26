# product-specs/03-backup.md — 월말 자동 백업

> Phase 2 스펙. Supabase → 구글시트 월말 자동 백업.
> CONSTITUTION 원칙 4 이행 수단.
>
> **의존성 주의**: 텔레그램 알림은 Phase 5(텔레그램 봇) 완료 후 추가.
> Phase 2에서는 백업 성공/실패를 backup_logs 테이블 기록으로만 확인.

---

## 1. 실행 흐름

```
매달 1일 15:00 UTC (= KST 00:00)
    ↓ Vercel Cron 트리거 (Pro 플랜 필요)
1. 전월 transactions 전체 조회 (Supabase, deleted_at IS NULL)
2. 전월 assets 스냅샷 조회
3. 전월 dividend 조회
    ↓
4. 각각 CSV 포맷 변환
    ↓
5. 구글시트 백업 시트에 append
   - transactions → 'Transactions_Backup' 시트
   - assets       → 'Assets_Backup' 시트
   - dividend     → 'Dividend_Backup' 시트
    ↓
6. backup_logs 기록 (success/failure + 건수)
7. [Phase 5 이후] 텔레그램 알림 발송
```

---

## 2. Vercel Cron 설정

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/monthly-backup",
      "schedule": "0 15 1 * *"
    }
  ]
}
```

> Vercel Cron은 UTC 기준. `0 15 1 * *` = 매달 1일 15:00 UTC = KST 00:00

---

## 3. API Route

```typescript
// app/api/cron/monthly-backup/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // x-backup-month 헤더로 수동 실행 시 특정 월 지정 가능
  const targetMonth = request.headers.get('x-backup-month') ?? getPreviousMonth()

  try {
    const [transactions, assets, dividends] = await Promise.all([
      fetchTransactions(targetMonth),
      fetchAssets(targetMonth),
      fetchDividends(targetMonth),
    ])

    await appendToSheet('Transactions_Backup', transactions)
    await appendToSheet('Assets_Backup', assets)
    await appendToSheet('Dividend_Backup', dividends)

    await logBackup(targetMonth, 'success', {
      transactions: transactions.length,
      assets: assets.length,
      dividends: dividends.length,
    })

    // TODO Phase 5: await sendTelegramNotification(...)

    return Response.json({ ok: true, month: targetMonth })

  } catch (error) {
    await logBackup(targetMonth, 'failure', { error: String(error) })
    return Response.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
```

---

## 4. 구글시트 append

```typescript
// lib/backup/sheets.ts
import { google } from 'googleapis'

export async function appendToSheet(sheetName: string, rows: Record<string, unknown>[]) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.BACKUP_SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: rows.map(rowToArray) },
  })
}
```

---

## 5. 구글시트 백업 구조

기존 구글시트에 시트 3개 추가. **직접 편집 금지** (스크립트 append 전용).

| 시트명 | 컬럼 순서 |
|--------|---------|
| `Transactions_Backup` | date, class_type, category, subcategory, item, user_name, amount, memo, tags |
| `Assets_Backup` | snapshot_date, asset_type, institution, owner, balance, contribution_rate |
| `Dividend_Backup` | date, account, ticker_name, ticker_symbol, exchange_rate, usd_amount, krw_amount |

---

## 6. 수동 실행

```bash
curl -X GET https://heeone-finance.vercel.app/api/cron/monthly-backup \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "x-backup-month: 2026-02"
```

---

## 7. 운섭 월초 검증 체크리스트

1. 구글시트 `Transactions_Backup`에서 전월 행 건수 확인
2. 수입/지출 합계가 대시보드와 일치하는지 확인
3. 불일치 발견 시 → Supabase Admin에서 수정 (구글시트 편집 금지)
