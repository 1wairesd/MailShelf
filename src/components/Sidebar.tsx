import React from 'react'
import {
  Inbox,
  CheckCircle,
  Battery,
  Clock,
  Skull,
  Archive,
  BarChart2,
  Download,
  Upload,
  Hash,
  Zap,
  Settings,
  ArrowUpCircle,
  FileJson,
  Sheet,
  Keyboard,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { useGroupsStore } from '@/store/groupsStore'
import { useTagRulesStore } from '@/store/tagRulesStore'
import { useDragStore } from '@/store/dragStore'
import { AccountStatus } from '@/types'
import { useToast } from './ui/toast'
import { UpdateModal } from './UpdateModal'
import { useUpdateCheck } from '@/hooks/useUpdateCheck'
import { Tooltip } from './ui/tooltip'
import { Dialog, DialogHeader, DialogBody } from './ui/dialog'
import { GroupModal } from './GroupModal'

const STATUS_ITEMS: { status: AccountStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { status: 'all', label: 'All Accounts', icon: <Inbox size={15} /> },
  { status: 'active', label: 'Active', icon: <CheckCircle size={15} /> },
  { status: 'exhausted', label: 'Exhausted', icon: <Battery size={15} /> },
  { status: 'waiting-reset', label: 'Waiting Reset', icon: <Clock size={15} /> },
  { status: 'dead', label: 'Dead', icon: <Skull size={15} /> },
  { status: 'archived', label: 'Archived', icon: <Archive size={15} /> },
]

export function Sidebar({ onOpenTagRules, onOpenSettings, onShowShortcuts }: { onOpenTagRules: () => void; onOpenSettings: () => void; onShowShortcuts: () => void }) {
  const {
    stats,
    filters,
    allTags,
    tagCounts,
    setStatusFilter,
    setTagFilter,
    setGroupFilter,
    exportData,
    exportCSV,
    importData,
  } = useAccountStore()
  const { showConfirm } = useAccountStore.getState()
  const { groups, groupCounts, deleteGroup } = useGroupsStore()
  const { rules } = useTagRulesStore()
  const { toast } = useToast()
  const draggingAccountId = useDragStore(s => s.draggingAccountId)
  const [dragOverGroupId, setDragOverGroupId] = React.useState<string | null>(null)

  // Reset hover highlight when drag ends (e.g. dropped outside any group)
  React.useEffect(() => {
    if (!draggingAccountId) setDragOverGroupId(null)
  }, [draggingAccountId])
  const enabledRulesCount = rules.filter(r => r.enabled).length
  const { status: updateStatus, info: updateInfo, check: checkUpdate, install: installUpdate } = useUpdateCheck()
  const [updateOpen, setUpdateOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [groupModalOpen, setGroupModalOpen] = React.useState(false)
  const [editingGroup, setEditingGroup] = React.useState<import('@/types').Group | null>(null)

  const hasUpdate = updateStatus === 'downloaded' || updateStatus === 'available' || updateStatus === 'downloading'

  const [appVersion, setAppVersion] = React.useState<string>('')

  React.useEffect(() => {
    window.api.app.getVersion().then((v: string) => setAppVersion(`v${v}`)).catch(() => {})
  }, [])

  // Load rules once so the badge count is accurate
  React.useEffect(() => {
    useTagRulesStore.getState().loadRules()
  }, [])

  const activeTagFilters = filters.tags ?? []
  const activeGroupId = filters.groupId ?? null

  const handleOpenCreateGroup = () => {
    setEditingGroup(null)
    setGroupModalOpen(true)
  }

  const handleOpenEditGroup = (e: React.MouseEvent, group: import('@/types').Group) => {
    e.stopPropagation()
    setEditingGroup(group)
    setGroupModalOpen(true)
  }

  const handleDeleteGroup = (e: React.MouseEvent, group: import('@/types').Group) => {
    e.stopPropagation()
    const count = groupCounts[group.id] ?? 0
    showConfirm({
      title: `Delete group "${group.name}"?`,
      description: count > 0
        ? `This group contains ${count} account${count !== 1 ? 's' : ''}. They will become ungrouped, but won't be deleted.`
        : 'This group will be permanently deleted.',
      confirmLabel: 'Delete group',
      onConfirm: async () => {
        await deleteGroup(group.id)
        if (activeGroupId === group.id) setGroupFilter(null)
        toast(`Group "${group.name}" deleted`, 'info')
      },
    })
  }

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
    // cancelled — no toast
  }

  const toggleTag = (tag: string) => {
    if (activeTagFilters.includes(tag)) {
      setTagFilter(activeTagFilters.filter(t => t !== tag))
    } else {
      setTagFilter([...activeTagFilters, tag])
    }
  }

  const getCount = (status: AccountStatus | 'all') => {
    if (status === 'all') return stats.total
    return stats[status] ?? 0
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-shelf-bg border-r border-shelf-border overflow-hidden">

      {/* ── Scrollable top section ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">

      {/* Stats header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-shelf-elevated/50">
          <BarChart2 size={13} className="text-shelf-accent" />
          <span className="text-xs text-shelf-text-muted font-medium">
            {stats.total} account{stats.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Status filters */}
      <div className="px-3 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle px-2 mb-1">
          Status
        </p>
        <nav className="flex flex-col gap-0.5">
          {STATUS_ITEMS.map(item => {
            const isActive = filters.status === item.status
            const count = getCount(item.status)

            return (
              <button
                key={item.status}
                onClick={() => setStatusFilter(item.status)}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all duration-100 text-left w-full group',
                  isActive
                    ? 'bg-shelf-accent/15 text-shelf-accent hover:bg-shelf-accent/25'
                    : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                )}
              >
                <span className={cn(
                  'transition-colors',
                  isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle group-hover:text-shelf-text-muted'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-medium tabular-nums',
                    isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Groups */}
      <div className="px-3 py-1 mt-1">
        <div className="flex items-center justify-between px-2 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle">
            Groups
          </p>
          <Tooltip content="New group">
            <button
              onClick={handleOpenCreateGroup}
              className="p-0.5 rounded text-shelf-text-subtle hover:text-shelf-accent hover:bg-shelf-elevated transition-colors"
            >
              <Plus size={11} />
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col gap-0.5">
          {groups.length === 0 && (
            <button
              onClick={handleOpenCreateGroup}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-shelf-text-subtle hover:text-shelf-accent hover:bg-shelf-elevated transition-colors"
            >
              <Plus size={11} />
              <span>Add a group…</span>
            </button>
          )}
          {groups.map(group => {
            const isActive = activeGroupId === group.id
            const count = groupCounts[group.id] ?? 0
            const isDragOver = draggingAccountId !== null && dragOverGroupId === group.id
            const isDragHint = draggingAccountId !== null && !isDragOver
            return (
              <div
                key={group.id}
                className="group/item relative flex items-center"
                onDragOver={e => {
                  if (!draggingAccountId) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverGroupId(group.id)
                }}
                onDragLeave={() => setDragOverGroupId(null)}
                onDrop={async e => {
                  e.preventDefault()
                  setDragOverGroupId(null)
                  const accountId = e.dataTransfer.getData('text/plain')
                  if (!accountId) return
                  await useGroupsStore.getState().moveAccountsToGroup(group.id, [accountId])
                  await useGroupsStore.getState().loadGroupCounts()
                  useAccountStore.getState().loadAccounts()
                  toast(`Moved to "${group.name}"`, 'success')
                }}
              >
                <button
                  onClick={() => setGroupFilter(isActive ? null : group.id)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-100 text-left min-w-0',
                    isDragOver
                      ? 'bg-shelf-accent/25 text-shelf-accent'
                      : isDragHint
                        ? 'bg-shelf-elevated/70 text-shelf-text'
                        : isActive
                          ? 'bg-shelf-accent/15 text-shelf-accent'
                          : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                  )}
                >
                  <span
                    className="shrink-0 transition-colors"
                    style={{ color: isDragOver ? undefined : isDragHint ? group.color : isActive ? undefined : group.color }}
                  >
                    {isDragOver || isDragHint ? <FolderOpen size={14} /> : isActive ? <FolderOpen size={14} /> : <Folder size={14} />}
                  </span>
                  <span className="truncate flex-1">{group.name}</span>
                  {isDragOver && (
                    <span className="text-[10px] font-medium text-shelf-accent shrink-0">drop</span>
                  )}
                  {!isDragOver && !isDragHint && count > 0 && (
                    <span className={cn(
                      'text-[10px] font-medium tabular-nums shrink-0',
                      isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
                {/* Edit / Delete — visible on hover, hidden during drag */}
                {!draggingAccountId && (
                  <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity bg-shelf-bg rounded">
                    <button
                      onClick={e => handleOpenEditGroup(e, group)}
                      className="p-1 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={e => handleDeleteGroup(e, group)}
                      className="p-1 rounded text-shelf-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="px-3 py-2 mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle px-2 mb-1">
            Tags
          </p>
          <div className="flex flex-col gap-0.5">
            {allTags.map(tag => {
              const isActive = activeTagFilters.includes(tag)
              const count = tagCounts[tag] ?? 0
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-100 text-left w-full group',
                    isActive
                      ? 'bg-shelf-accent/15 text-shelf-accent hover:bg-shelf-accent/25'
                      : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                  )}
                >
                  <Hash size={12} className="shrink-0" />
                  <span className="truncate flex-1">{tag}</span>
                  {count > 0 && (
                    <span className={cn(
                      'text-[10px] font-medium tabular-nums',
                      isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

        </div>
      )}
      {/* ── End scrollable section ── */}
      </div>

      {/* Import/Export — fixed at bottom */}
      <div className="shrink-0 border-t border-shelf-border">
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
              <span className="ml-auto text-[10px] font-medium tabular-nums bg-shelf-accent/20 text-shelf-accent px-1.5 py-0.5 rounded-full">
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
      </div>

      {/* Version + Settings + Updates */}
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
              updateStatus === 'downloaded' ? `v${updateInfo.version} ready — click to install` :
              updateStatus === 'downloading' ? `Downloading… ${updateInfo.percent ?? 0}%` :
              updateStatus === 'available' ? `Update available: v${updateInfo.version}` :
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

      <GroupModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        editing={editingGroup}
      />
    </aside>
  )
}
