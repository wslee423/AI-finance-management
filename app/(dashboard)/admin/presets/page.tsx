'use client'

import { useState, useEffect } from 'react'
import { type PresetTemplate, type UserName, USER_NAMES, SUBCATEGORIES } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Toast from '@/components/ui/Toast'

const EMPTY_FORM = {
  name: '',
  category: '고정지출',
  subcategory: '',
  item: '',
  user_name: '공동' as UserName,
  memo: '',
  amount: '',
}

export default function PresetsPage() {
  const [presets, setPresets] = useState<PresetTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/presets?active=false')
      if (!res.ok) throw new Error()
      setPresets(await res.json())
    } catch {
      setToast({ message: '조회에 실패했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  function handleEdit(p: PresetTemplate) {
    setForm({
      name: p.name,
      category: p.category,
      subcategory: p.subcategory ?? '',
      item: p.item ?? '',
      user_name: p.user_name,
      memo: p.memo ?? '',
      amount: String(p.amount),
    })
    setEditId(p.id)
    setShowForm(true)
  }

  async function handleToggleActive(p: PresetTemplate) {
    try {
      const res = await fetch(`/api/presets/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !p.is_active }),
      })
      if (!res.ok) throw new Error()
      setToast({ message: p.is_active ? '비활성화되었습니다' : '활성화되었습니다', type: 'success' })
      fetchData()
    } catch {
      setToast({ message: '변경에 실패했습니다', type: 'error' })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      amount: Number(form.amount),
      subcategory: form.subcategory || null,
      item: form.item || null,
      memo: form.memo || null,
    }
    try {
      const res = editId
        ? await fetch(`/api/presets/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      setToast({ message: editId ? '수정되었습니다' : '추가되었습니다', type: 'success' })
      setForm(EMPTY_FORM)
      setEditId(null)
      setShowForm(false)
      fetchData()
    } catch {
      setToast({ message: '저장에 실패했습니다', type: 'error' })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">고정지출 템플릿</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM) }}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 추가
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">템플릿 이름</label>
              <input type="text" value={form.name} onChange={e => setForm(f=>({...f, name: e.target.value}))} required placeholder="[보험1]/Owner" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">세부카테고리</label>
              <select value={form.subcategory} onChange={e => setForm(f=>({...f, subcategory: e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                <option value="">선택 안함</option>
                {(SUBCATEGORIES['고정지출'] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">사용자</label>
              <div className="flex gap-1 flex-wrap">
                {USER_NAMES.map(u => (
                  <button key={u} type="button" onClick={() => setForm(f=>({...f, user_name: u}))}
                    className={`px-3 py-1.5 text-xs rounded-lg border ${form.user_name === u ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">기본 금액 (원)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f=>({...f, amount: e.target.value}))} required min="0" placeholder="0 (매달 변동이면 0)" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
            <input type="text" value={form.memo} onChange={e => setForm(f=>({...f, memo: e.target.value}))} placeholder="선택 입력" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM) }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">취소</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editId ? '수정' : '추가'}</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">로딩 중...</div>
        ) : presets.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">등록된 템플릿이 없어요</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['이름','세부카테고리','사용자','금액','상태',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {presets.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${!p.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.subcategory ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.user_name}</td>
                  <td className="px-4 py-3 text-gray-800">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(p)} className="text-xs text-blue-600 hover:underline">수정</button>
                      <button onClick={() => handleToggleActive(p)} className="text-xs text-gray-500 hover:underline">
                        {p.is_active ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
