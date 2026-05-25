import React from 'react'
import { cn, generateTagColor } from '@/lib/utils'
import { X } from 'lucide-react'

interface TagBadgeProps {
  tag: string
  onRemove?: () => void
  size?: 'sm' | 'md'
  className?: string
}

export function TagBadge({ tag, onRemove, size = 'md', className }: TagBadgeProps) {
  const colorClass = generateTagColor(tag)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colorClass,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      {tag}
      {onRemove && (
        <button
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:opacity-70 transition-opacity ml-0.5"
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}
