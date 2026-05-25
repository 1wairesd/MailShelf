import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  error?: string
}

export type UpdateStatus = 'idle' | 'checking' | 'done' | 'error'

export function useUpdateCheck() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [info, setInfo] = useState<UpdateInfo | null>(null)

  const check = useCallback(async () => {
    setStatus('checking')
    try {
      const result = await api.app.checkForUpdates()
      setInfo(result)
      setStatus(result.error ? 'error' : 'done')
    } catch (err) {
      setInfo({ hasUpdate: false, currentVersion: '', error: String(err) })
      setStatus('error')
    }
  }, [])

  // Auto-check once on mount, after a short delay so it doesn't block startup
  useEffect(() => {
    const timer = setTimeout(check, 3000)
    return () => clearTimeout(timer)
  }, [check])

  return { status, info, check }
}
