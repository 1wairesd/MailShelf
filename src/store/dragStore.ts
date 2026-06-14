import { create } from 'zustand'

/**
 * Minimal drag state shared between AccountCard (drag source)
 * and Sidebar group items (drop targets).
 *
 * We use a plain Zustand store instead of React context so any component
 * can read/write it without prop-drilling through the tree.
 */
interface DragStore {
  /** ID of the account being dragged, or null when idle */
  draggingAccountId: string | null
  setDraggingAccountId: (id: string | null) => void
}

export const useDragStore = create<DragStore>((set) => ({
  draggingAccountId: null,
  setDraggingAccountId: (id) => set({ draggingAccountId: id }),
}))
