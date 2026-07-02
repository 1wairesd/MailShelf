import React from 'react'
import {
  Download, Upload, Zap, Settings, ArrowUpCircle, Keyboard,
  FileJson, Sheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { useTagRulesStore } from '@/store/tagRulesStore'
import { useToast } from '@/components/ui/toast'
import { UpdateModal } from '@/components/UpdateModal'
import { useUpdateCheck } from '@/hooks/useUpdateCheck'
import { Tooltip } from '@/components/ui/tooltip'
import { Dialog, DialogHeader, DialogBody } from '@/components/ui/dialog'

interface Props {
  onOpenTagRules: () => void
  onOpenSettings: () => void
  onShowShortcuts: () => void
}

export function SidebarFooter({ onOpenTagRules, onOpenSettings, onShowShortcuts }: Props) {
  const { toast } = useToast()
  const rules = useTagRulesStore(s => s.rules)
  const enabledRulesCount = rules.filter(r => r.enabled).length

  const { exportData, exportCSV, importData } = useAccountStore.getState()

  const { status: updateStatus, info: updateInfo, check: checkUpdate, install: installUpdate } = useUpdateCheck()
  const [updateOpen, setUpdateOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)

  const hasUpdate = updateStatus === 'downloaded' || updateStatus === 'available' || updateStatus === 'downloading'

  const [appVersion, setAppVersion] = React.useState('')
  React.useEffect(() => {
    window.api.app.getVersion().then((v: string) => setAppVersion(`v${v}`)).catch(() => {})
  }, [])

  const handleExport = async () => {
    const result = await exportData()
    if (result.success) {
      toast(`Exported ${result.count ?? 0} account${result.count !== 1 ? 's' : ''}`, 'success')
    }
  }

  const handleExportCSV = async () => {
    const result = await exportCSV()
    if (result.success) {
      toast(`Exported ${result.count ?? 0} account${result.count !== 1 ? 's' : ''} as CSV`, 'success')
    }
  }

  const handleImport = async () => {
    const result = await importData()
    if (result.success) {
      toast(`Imported ${result.count ?? 0} account${result.count !== 1 ? 's' : ''}`, 'success')
    }
  }

  return (
    <div className="shrink-0 border-t border-shelf-border">
      {/* Data actions */}
      <div className="px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle px-2 mb-1.5">
          Data
        </p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onOpenTagRules}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text transition-colors"
          >
            <Zap size={14} className="shrink-0" />
            <span>Tag Rules</span>
            {enabledRulesCount > 0 && (
              <span className="ml-auto text-xs font-medium tabular-nums bg-shelf-elevated text-shelf-text-muted px-1.5 py-0.5 rounded">
                {enabledRulesCount}
              </span>
            )}
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text transition-colors"
          >
            <Upload size={14} />
            <span>Import JSON</span>
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text transition-colors"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Version + icon buttons */}
      {appVersion && (
        <div className="px-3 pb-3 flex items-center justify-between">
          <span className="text-xs text-shelf-text-subtle tabular-nums">{appVersion}</span>
          <div className="flex items-center gap-0.5">
            <Tooltip content="Keyboard shortcuts (?)">
              <button
                onClick={onShowShortcuts}
                className="p-1.5 rounded-md text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
              >
                <Keyboard size={15} />
              </button>
            </Tooltip>
            <Tooltip content={
              updateStatus === 'downloaded'  ? `v${updateInfo.version} ready — click to install` :
              updateStatus === 'downloading' ? `Downloading… ${updateInfo.percent ?? 0}%` :
              updateStatus === 'available'   ? `Update available: v${updateInfo.version}` :
              'Check for updates'
            }>
              <button
                onClick={() => setUpdateOpen(true)}
                className={cn(
                  'relative p-1.5 rounded-md transition-colors',
                  hasUpdate
                    ? 'text-shelf-accent hover:bg-shelf-accent/10'
                    : 'text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated'
                )}
              >
                <ArrowUpCircle size={15} />
                {hasUpdate && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-shelf-accent" />
                )}
              </button>
            </Tooltip>
            <Tooltip content="Settings">
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-md text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
              >
                <Settings size={15} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Update modal */}
      <UpdateModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        status={updateStatus}
        info={updateInfo}
        onCheck={checkUpdate}
        onInstall={installUpdate}
      />

      {/* Export format dialog */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} className="max-w-xs">
        <DialogHeader title="Export Accounts" onClose={() => setExportOpen(false)} />
        <DialogBody>
          <p className="text-xs text-shelf-text-subtle mb-4">
            Choose a format. Passwords will be exported in plain text.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setExportOpen(false); handleExport() }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-shelf-border hover:border-shelf-accent hover:bg-shelf-accent/8 text-left transition-colors group"
            >
              <FileJson size={18} className="text-shelf-text-subtle group-hover:text-shelf-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-shelf-text">JSON</p>
                <p className="text-xs text-shelf-text-subtle">Full data, re-importable</p>
              </div>
            </button>
            <button
              onClick={() => { setExportOpen(false); handleExportCSV() }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-shelf-border hover:border-shelf-accent hover:bg-shelf-accent/8 text-left transition-colors group"
            >
              <Sheet size={18} className="text-shelf-text-subtle group-hover:text-shelf-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-shelf-text">CSV</p>
                <p className="text-xs text-shelf-text-subtle">For Excel / Google Sheets</p>
              </div>
            </button>
          </div>
        </DialogBody>
      </Dialog>
    </div>
  )
}
