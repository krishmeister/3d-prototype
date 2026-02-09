import { create } from 'zustand';

interface AppState {
    phase: 'setup' | 'explore';
    setPhase: (phase: 'setup' | 'explore') => void;
    startExperience: () => void;
}

export const useStore = create<AppState>((set) => ({
    phase: 'setup',
    setPhase: (phase) => set({ phase }),
    startExperience: () => set({ phase: 'explore' }),
}));
