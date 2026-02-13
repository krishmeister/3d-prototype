import { create } from 'zustand';

interface AppState {
    phase: 'setup' | 'explore';
    setPhase: (phase: 'setup' | 'explore') => void;
    startExperience: () => void;

    // Device detection
    isMobile: boolean;
    setIsMobile: (val: boolean) => void;

    // Touch input (mobile joystick)
    joystickInput: { x: number; y: number };
    setJoystickInput: (x: number, y: number) => void;

    // Touch look deltas (mobile camera rotation)
    touchLookDelta: { x: number; y: number };
    setTouchLookDelta: (x: number, y: number) => void;

    // Light control state
    activeLightId: string | null;
    lightStates: Record<string, boolean>;
    setActiveLightId: (id: string | null) => void;
    toggleLight: (id: string) => void;
    setLightOn: (id: string, on: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    phase: 'setup',
    setPhase: (phase) => set({ phase }),
    startExperience: () => set({ phase: 'explore' }),

    isMobile: false,
    setIsMobile: (val) => set({ isMobile: val }),

    joystickInput: { x: 0, y: 0 },
    setJoystickInput: (x, y) => set({ joystickInput: { x, y } }),

    touchLookDelta: { x: 0, y: 0 },
    setTouchLookDelta: (x, y) => set({ touchLookDelta: { x, y } }),

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
