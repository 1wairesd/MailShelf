import React from 'react'
import { Plus, Pencil, Trash2, ChevronDown, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { useGroupsStore } from '@/store/groupsStore'
import { useDragStore } from '@/store/dragStore'
import { useToast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { Group } from '@/types'

interface Props {
  onOpenCreate: () => void
  onOpenEdit: (e: React.MouseEvent, group: Group) => void
}

export function SidebarGroupList({ onOpenCreate, onOpenEdit }: Props) {
  const { groups, groupCounts, deleteGroup } = useGroupsStore()
  const { toast } = useToast()

  const activeGroupId     = useAccountStore(s => s.filters.groupId ?? null)
  const { setGroupFilter, showConfirm } = useAccountStore.getState()

  const draggingAccountId = useDragStore(s => s.draggingAccountId)
  const groupsCollapsed   = useDragStore(s => s.groupsCollapsed)
  const { setGroupsCollapsed } = useDragStore.getState()

  const [dragOverGroupId, setDragOverGroupId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!draggingAccountId) setDragOverGroupId(null)
  }, [draggingAccountId])

  const handleDelete = (e: React.MouseEvent, group: Group) => {
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

  return (
    <div className="px-3 py-1 mt-1">
      <div className="flex items-center justify-between px-2 mb-1">
        <button
          onClick={() => setGroupsCollapsed(!groupsCollapsed)}
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle hover:text-shelf-text-muted transition-colors"
        >
          <ChevronDown
            size={11}
            className={cn('transition-transform duration-150', groupsCollapsed && '-rotate-90')}
          />
          Groups
        </button>
        <Tooltip content="New group">
          <button
            onClick={onOpenCreate}
            className="p-0.5 rounded text-shelf-text-subtle hover:text-shelf-accent hover:bg-shelf-elevated transition-colors"
          >
            <Plus size={11} />
          </button>
        </Tooltip>
      </div>

      {!groupsCollapsed && (
        <div className="flex flex-col gap-0.5">
          {groups.length === 0 && (
            <button
              onClick={onOpenCreate}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-shelf-text-subtle hover:text-shelf-accent hover:bg-shelf-elevated transition-colors"
            >
              <Plus size={11} />
              <span>Add a group…</span>
            </button>
          )}
          {groups.map(group => {
            const isActive   = activeGroupId === group.id
            const count      = groupCounts[group.id] ?? 0
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
                    isDragOver  ? 'bg-shelf-accent/25 text-shelf-accent'
                    : isDragHint ? 'bg-shelf-elevated/70 text-shelf-text'
                    : isActive   ? 'bg-shelf-accent/15 text-shelf-accent hover:bg-shelf-accent/25'
                    : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                  )}
                >
                  <span
                    className="shrink-0 transition-colors"
                    style={{ color: isDragOver ? undefined : isDragHint ? group.color : isActive ? undefined : group.color }}
                  >
                    {isDragOver || isDragHint || isActive
                      ? <FolderOpen size={14} />
                      : <Folder size={14} />
                    }
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
                      onClick={e => onOpenEdit(e, group)}
                      className="p-1 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={e => handleDelete(e, group)}
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
      )}
    </div>
  )
}
