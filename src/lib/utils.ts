import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 365) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function generateTagColor(tag: string): string {
  const colors = [
    'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 tag-indigo',
    'bg-purple-500/15 text-purple-300 border-purple-500/20 tag-purple',
    'bg-blue-500/15 text-blue-300 border-blue-500/20 tag-blue',
    'bg-cyan-500/15 text-cyan-300 border-cyan-500/20 tag-cyan',
    'bg-teal-500/15 text-teal-300 border-teal-500/20 tag-teal',
    'bg-green-500/15 text-green-300 border-green-500/20 tag-green',
    'bg-yellow-500/15 text-yellow-300 border-yellow-500/20 tag-yellow',
    'bg-orange-500/15 text-orange-300 border-orange-500/20 tag-orange',
    'bg-pink-500/15 text-pink-300 border-pink-500/20 tag-pink',
    'bg-rose-500/15 text-rose-300 border-rose-500/20 tag-rose',
  ]
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
