import { create } from 'zustand';

interface AppState {
    phase: 'setup' | 'explore';
    setPhase: (phase: 'setup' | 'explore') => void;
    startExperience: () => void;

    // Light control state
    activeLightId: string | null;          // Which light the player is near (phone shown)
    lightStates: Record<string, boolean>;  // lightId -> isOn
    setActiveLightId: (id: string | null) => void;
    toggleLight: (id: string) => void;
    setLightOn: (id: string, on: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    phase: 'setup',
    setPhase: (phase) => set({ phase }),
    startExperience: () => set({ phase: 'explore' }),

    activeLightId: null,
    lightStates: {},
    setActiveLightId: (id) => set({ activeLightId: id }),
    toggleLight: (id) =>
        set((state) => ({
            lightStates: {
                ...state.lightStates,
                [id]: !state.lightStates[id],
            },
        })),
    setLightOn: (id, on) =>
        set((state) => ({
            lightStates: {
                ...state.lightStates,
                [id]: on,
            },
        })),
}));
