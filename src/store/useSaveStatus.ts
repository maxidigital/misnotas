import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const useSaveStatus = create<{ status: SaveStatus; set: (s: SaveStatus) => void }>((set) => ({
  status: 'idle',
  set: (status) => set({ status }),
}));
