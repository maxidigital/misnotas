import { create } from 'zustand';

/** El único estado que se dibuja es 'error'; ver SaveIndicator. */
export type SaveStatus = 'idle' | 'saved' | 'error';

export const useSaveStatus = create<{ status: SaveStatus; set: (s: SaveStatus) => void }>((set) => ({
  status: 'idle',
  set: (status) => set({ status }),
}));
