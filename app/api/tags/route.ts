import { getAuthUser, unauthorized } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select('tags')
    .is('deleted_at', null)
    .not('tags', 'is', null)
    .neq('tags', '')

  const tagMap = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row.tags) continue
    row.tags.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => {
      tagMap.set(t, (tagMap.get(t) ?? 0) + 1)
    })
  }

  // 사용 빈도 내림차순 정렬
  const tags = Array.from(tagMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([tag]) => tag)

  return Response.json(tags)
}
