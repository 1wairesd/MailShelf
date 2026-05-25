import React from 'react'
import { cn } from '@/lib/utils'
import { AccountStatus, STATUS_CONFIG } from '@/types'

interface StatusBadgeProps {
  status: AccountStatus
  size?: 'sm' | 'md'
  showDot?: boolean
}

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        'border-transparent'
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', config.dotColor, size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5')} />
      )}
      {config.label}
    </span>
  )
}
