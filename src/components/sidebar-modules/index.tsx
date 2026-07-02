import React from 'react'
import { useTagRulesStore } from '@/store/tagRulesStore'
import { GroupModal } from '@/components/GroupModal'
import { Group } from '@/types'
import { SidebarStatusList } from './SidebarStatusList'
import { SidebarGroupList } from './SidebarGroupList'
import { SidebarTagList } from './SidebarTagList'
import { SidebarFooter } from './SidebarFooter'

interface Props {
  onOpenTagRules: () => void
  onOpenSettings: () => void
  onShowShortcuts: () => void
}

export function Sidebar({ onOpenTagRules, onOpenSettings, onShowShortcuts }: Props) {
  const [groupModalOpen, setGroupModalOpen] = React.useState(false)
  const [editingGroup, setEditingGroup]     = React.useState<Group | null>(null)

  // Load rules once so the badge count in footer is accurate
  React.useEffect(() => {
    useTagRulesStore.getState().loadRules()
  }, [])

  const handleOpenCreate = () => {
    setEditingGroup(null)
    setGroupModalOpen(true)
  }

  const handleOpenEdit = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation()
    setEditingGroup(group)
    setGroupModalOpen(true)
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-shelf-bg border-r border-shelf-border overflow-hidden">
      {/* Scrollable section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className="pt-3">
          <SidebarStatusList />
          <SidebarGroupList
            onOpenCreate={handleOpenCreate}
            onOpenEdit={handleOpenEdit}
          />
          <SidebarTagList />
        </div>
      </div>

      {/* Fixed bottom */}
      <SidebarFooter
        onOpenTagRules={onOpenTagRules}
        onOpenSettings={onOpenSettings}
        onShowShortcuts={onShowShortcuts}
      />

      <GroupModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        editing={editingGroup}
      />
    </aside>
  )
}
