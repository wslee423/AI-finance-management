'use client'

import { useState, useRef } from 'react'

interface TagInputProps {
  value: string
  onChange: (value: string) => void
  existingTags: string[]
}

export default function TagInput({ value, onChange, existingTags }: TagInputProps) {
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : []
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(tag: string) {
    const normalized = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`
    if (!normalized || normalized === '#') return
    if (!tags.includes(normalized)) {
      onChange([...tags, normalized].join(','))
    }
    setInput('')
    setSuggestions([])
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag).join(','))
  }

  function handleInputChange(val: string) {
    setInput(val)
    if (val.length > 0) {
      const q = val.startsWith('#') ? val.slice(1).toLowerCase() : val.toLowerCase()
      const filtered = existingTags.filter(t =>
        t.toLowerCase().includes(q) && !tags.includes(t)
      )
      setSuggestions(filtered.slice(0, 8))
    } else {
      setSuggestions([])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === ',' || e.key === ' ') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === 'Escape') {
      setSuggestions([])
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg min-h-[38px] bg-white cursor-text focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              className="ml-0.5 hover:text-blue-900 font-bold leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          placeholder={tags.length === 0 ? '#태그 입력 후 Enter' : ''}
          className="flex-1 min-w-24 text-sm outline-none bg-transparent"
        />
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(s => (
            <li
              key={s}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
              onMouseDown={e => { e.preventDefault(); addTag(s) }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
