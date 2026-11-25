import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'warn';
}

interface UiState {
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useUi = create<UiState>((set) => ({
  toasts: [],
  toast: (text, tone = 'info') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (text: string, tone: Toast['tone'] = 'info') => useUi.getState().toast(text, tone);
