import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({ value, onChange, options, placeholder, className, disabled }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full h-8 appearance-none rounded-md border border-shelf-border bg-shelf-surface px-3 pr-8 text-sm text-shelf-text',
          'focus:outline-none focus:ring-1 focus:ring-shelf-accent focus:border-shelf-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'cursor-pointer'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-shelf-surface">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-shelf-text-muted pointer-events-none"
      />
    </div>
  )
}
