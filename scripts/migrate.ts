/**
 * scripts/migrate.ts
 * finance_table.xlsx → Supabase 1회성 마이그레이션 스크립트
 *
 * 실행:
 *   npx tsx scripts/migrate.ts --dry-run    # 검증만 (DB 변경 없음)
 *   npx tsx scripts/migrate.ts              # 실제 마이그레이션
 *   npx tsx scripts/migrate.ts --sheet=transactions
 */

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

// ─── 설정 ────────────────────────────────────────────────────────────────────

const XLSX_PATH = path.resolve(__dirname, '../../finance_table.xlsx')

const isDryRun = process.argv.includes('--dry-run')
const targetSheet = process.argv.find(a => a.startsWith('--sheet='))?.split('=')[1]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // RLS 우회를 위해 Service Role Key 사용
)

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

function toDateStr(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  if (typeof value === 'number') {
    // Excel serial date → JS Date
    const date = XLSX.SSF.parse_date_code(value)
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  return String(value).split('T')[0]
}

function toMonthLastDay(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function toAmount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  return Math.round(Number(value))
}

function normalizeUser(user: unknown): string {
  const u = String(user ?? '').trim()
  const map: Record<string, string> = {
    '운섭': '운섭', '아름': '아름', '희온': '희온', '공동': '공동',
  }
  return map[u] ?? '공동'
}

function normalizeCategory(type: unknown): string {
  const t = String(type ?? '').trim()
  if (t === '부수입') return '기타수입' // 정규화
  return t
}

function parseTags(value: unknown): string[] | null {
  if (!value) return null
  const str = String(value).trim()
  if (!str) return null
  return str.split(',').map(t => t.trim()).filter(Boolean)
}

function dedupeKey(...parts: unknown[]): string {
  return parts.map(p => String(p ?? '')).join('|')
}

// ─── Transactions 마이그레이션 ────────────────────────────────────────────────

async function migrateTransactions(wb: XLSX.WorkBook) {
  console.log('\n=== Transactions 마이그레이션 시작 ===')
  const ws = wb.Sheets['Transactions']
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

  const seen = new Set<string>()
  const toInsert: Record<string, unknown>[] = []
  let skipped = 0

  for (const row of rows) {
    const classVal = String(row['class'] ?? '').trim()

    // 이체(저축/투자) 제외
    if (classVal === '이체') {
      skipped++
      continue
    }

    if (classVal !== '수입' && classVal !== '지출') {
      skipped++
      continue
    }

    const dateStr = toDateStr(row['date'])
    if (!dateStr) { skipped++; continue }

    const amount = toAmount(row['amount'])
    if (amount <= 0) { skipped++; continue }

    const category = normalizeCategory(row['type'])
    const userName = normalizeUser(row['user'])

    // 중복 방지 키
    const key = dedupeKey(dateStr, amount, category, userName)
    if (seen.has(key)) {
      skipped++
      continue
    }
    seen.add(key)

    toInsert.push({
      date: dateStr,
      class_type: classVal,
      category: category,
      subcategory: row['category'] ? String(row['category']).trim() : null,
      item: row['subcategory'] ? String(row['subcategory']).trim() : null,
      user_name: userName,
      amount: amount,
      memo: row['memo'] ? String(row['memo']).trim() : null,
      tags: parseTags(row['tags']),
      // source 추적
      created_at: new Date().toISOString(),
    })
  }

  console.log(`  처리 예정: ${toInsert.length}건 / 제외: ${skipped}건`)

  if (isDryRun) {
    console.log('  [DRY RUN] DB 변경 없음. 샘플 3건:')
    toInsert.slice(0, 3).forEach(r => console.log(' ', JSON.stringify(r)))
    return toInsert.length
  }

  // 배치 upsert (500건씩)
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500)
    const { error } = await supabase.from('transactions').upsert(batch, {
      onConflict: 'date,amount,category,user_name',
      ignoreDuplicates: true,
    })
    if (error) {
      console.error(`  배치 ${i}~${i + batch.length} 오류:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`  진행: ${inserted}/${toInsert.length}\r`)
    }
  }

  console.log(`\n  완료: ${inserted}건 삽입`)
  return inserted
}

// ─── Assets 마이그레이션 ──────────────────────────────────────────────────────

async function migrateAssets(wb: XLSX.WorkBook) {
  console.log('\n=== Assets 마이그레이션 시작 ===')
  const ws = wb.Sheets['assets']
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

  const seen = new Set<string>()
  const toInsert: Record<string, unknown>[] = []
  let skipped = 0

  for (const row of rows) {
    const year = Number(row['year'])
    const month = Number(row['month'])
    if (!year || !month || isNaN(year) || isNaN(month)) { skipped++; continue }

    const snapshotDate = toMonthLastDay(year, month)
    const assetType = String(row['category'] ?? '').trim()
    const institution = String(row['assettype'] ?? '').trim() // assettype → institution
    const balance = toAmount(row['balance'])
    const owner = normalizeUser(row['owner'])

    if (!assetType || !institution) { skipped++; continue }

    const key = dedupeKey(snapshotDate, assetType, institution, owner)
    if (seen.has(key)) { skipped++; continue }
    seen.add(key)

    const memo = row['institution'] ? String(row['institution']).trim() : null

    toInsert.push({
      snapshot_date: snapshotDate,
      asset_type: assetType,
      institution: institution,
      owner: owner,
      balance: balance,
      contribution_rate: null, // 기본값: 단독 자산
      // 아파트(신정1단지)의 기여율은 마이그레이션 후 수동 설정 필요
      created_at: new Date().toISOString(),
      // institution 실제 기관명은 memo로 저장
      ...(memo && { memo }),
    })
  }

  console.log(`  처리 예정: ${toInsert.length}건 / 제외: ${skipped}건`)

  if (isDryRun) {
    console.log('  [DRY RUN] 샘플 3건:')
    toInsert.slice(0, 3).forEach(r => console.log(' ', JSON.stringify(r)))
    return toInsert.length
  }

  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500)
    const { error } = await supabase.from('assets').upsert(batch, {
      onConflict: 'snapshot_date,asset_type,institution,owner',
      ignoreDuplicates: true,
    })
    if (error) {
      console.error(`  배치 오류:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`  진행: ${inserted}/${toInsert.length}\r`)
    }
  }

  console.log(`\n  완료: ${inserted}건 삽입`)
  return inserted
}

// ─── Dividend 마이그레이션 ────────────────────────────────────────────────────

async function migrateDividend(wb: XLSX.WorkBook) {
  console.log('\n=== Dividend 마이그레이션 시작 ===')
  const ws = wb.Sheets['dividend']
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

  const seen = new Set<string>()
  const toInsert: Record<string, unknown>[] = []
  let skipped = 0

  for (const row of rows) {
    const dateStr = toDateStr(row['date'])
    if (!dateStr) { skipped++; continue }

    // ticker_symbol: 숫자(360750 등) → 문자열
    const ticker = row['ticker'] !== null ? String(row['ticker']).trim() : null
    const usdAmount = row['usd_dividend'] ? Number(row['usd_dividend']) : null
    const exchangeRate = row['day_usd'] ? Number(row['day_usd']) : null

    // krw_amount: krw_quivalent 우선 (계산값), 없으면 krw_dividend
    const krwAmount = toAmount(row['krw_quivalent'] ?? row['krw_dividend'])
    if (krwAmount <= 0) { skipped++; continue }

    const key = dedupeKey(dateStr, ticker, usdAmount ?? krwAmount)
    if (seen.has(key)) { skipped++; continue }
    seen.add(key)

    toInsert.push({
      date: dateStr,
      account: row['account'] ? String(row['account']).trim() : null,
      ticker_name: row['ticker_name'] ? String(row['ticker_name']).trim() : (ticker ?? ''),
      ticker_symbol: ticker,
      exchange_rate: exchangeRate,
      usd_amount: usdAmount,
      krw_amount: krwAmount,
      created_at: new Date().toISOString(),
    })
  }

  console.log(`  처리 예정: ${toInsert.length}건 / 제외: ${skipped}건`)

  if (isDryRun) {
    console.log('  [DRY RUN] 샘플 3건:')
    toInsert.slice(0, 3).forEach(r => console.log(' ', JSON.stringify(r)))
    return toInsert.length
  }

  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100)
    const { error } = await supabase.from('dividend').upsert(batch, {
      onConflict: 'date,ticker_symbol,usd_amount',
      ignoreDuplicates: true,
    })
    if (error) {
      console.error(`  배치 오류:`, error.message)
    } else {
      inserted += batch.length
    }
  }

  console.log(`  완료: ${inserted}건 삽입`)
  return inserted
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n희온이네 재정 비서 — 마이그레이션 스크립트`)
  console.log(`소스: ${XLSX_PATH}`)
  console.log(`모드: ${isDryRun ? '🔍 DRY RUN (DB 변경 없음)' : '🚀 실제 실행'}`)
  console.log(`대상: ${targetSheet ?? '전체 시트'}`)

  if (!isDryRun) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('\n❌ 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
      process.exit(1)
    }
  }

  const wb = XLSX.readFile(XLSX_PATH)
  console.log(`\n시트 목록: ${wb.SheetNames.join(', ')}`)

  const results: Record<string, number> = {}

  if (!targetSheet || targetSheet === 'transactions') {
    results.transactions = await migrateTransactions(wb)
  }
  if (!targetSheet || targetSheet === 'assets') {
    results.assets = await migrateAssets(wb)
  }
  if (!targetSheet || targetSheet === 'dividend') {
    results.dividend = await migrateDividend(wb)
  }

  console.log('\n=== 마이그레이션 완료 ===')
  Object.entries(results).forEach(([sheet, count]) => {
    console.log(`  ${sheet}: ${count}건`)
  })

  if (isDryRun) {
    console.log('\n[DRY RUN 완료] 실제 마이그레이션 실행 시: --dry-run 플래그 제거')
  } else {
    console.log('\n✅ 완료. MIGRATION.md §5 검증 체크리스트 확인 필요.')
  }
}

main().catch(err => {
  console.error('\n❌ 마이그레이션 실패:', err)
  process.exit(1)
})
