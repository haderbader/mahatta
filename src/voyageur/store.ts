import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PaxState {
  lang: 'fr' | 'ar';
  passengerId: string;
  from: string; to: string;
  favs: string[];
  alerts: Record<string, boolean>;
  set: (p: Partial<PaxState>) => void;
}
export const usePax = create<PaxState>()(persist((set) => ({
  lang: navigator.language?.startsWith('ar') ? 'ar' : 'fr',
  passengerId: crypto.randomUUID(),
  from: 'Rouiba', to: 'Aéroport',
  favs: ['El Harrach', 'Agha'],
  alerts: { E: true, O: true, GO: true },
  set: (p) => set(p),
}), { name: 'mahatta-voyageur' }));
