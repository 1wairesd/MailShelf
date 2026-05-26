import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'       // update found, downloading
  | 'downloading'     // download in progress
  | 'downloaded'      // ready to install
  | 'up-to-date'
  | 'error'

export interface UpdateInfo {
  version?: string
  percent?: number
  error?: string
}

export function useUpdateCheck() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [info, setInfo] = useState<UpdateInfo>({})

  const check = useCallback(() => {
    setStatus('checking')
    api.updater.check().catch(() => {})
  }, [])

  useEffect(() => {
    const unsubs = [
      api.updater.onUpdateAvailable(({ version }) => {
        setStatus('available')
        setInfo({ version })
      }),
      api.updater.onUpdateNotAvailable(() => {
        setStatus('up-to-date')
      }),
      api.updater.onDownloadProgress(({ percent }) => {
        setStatus('downloading')
        setInfo(prev => ({ ...prev, percent }))
      }),
      api.updater.onUpdateDownloaded(({ version }) => {
        setStatus('downloaded')
        setInfo({ version })
      }),
      api.updater.onError(({ message }) => {
        setStatus('error')
        setInfo({ error: message })
      }),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  const install = useCallback(() => {
    api.updater.install()
  }, [])

  return { status, info, check, install }
}
