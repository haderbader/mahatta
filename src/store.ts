import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import type { Cause, Lang, Tr, TrainDef, DriverEvent } from '../shared/domain.ts';

const idb: StateStorage = {
  getItem: async (k) => (await get(k)) ?? null,
  setItem: (k, v) => set(k, v),
  removeItem: (k) => del(k),
};

export interface Incident { causeK: string; sub: number | null; est: number; at: number; sent: boolean }
export interface Msg { id: number; at: number; fr: string; ar: string; ack: boolean }
export interface Hist { at: number; label: Tr; clientId: string; sent: boolean }

interface State {
  lang: Lang; theme: 'dark' | 'light';
  serviceId: number | null; rame: string; train: TrainDef | null;
  online: boolean; gps: boolean;
  speed: number; stopAt: number | null; stopIdx: number; delay: number;
  incident: Incident | null; msgs: Msg[]; hist: Hist[]; queue: DriverEvent[];
  set: (p: Partial<State>) => void;
  reset: () => void;
}

const fresh = { serviceId: null, rame: '', train: null, speed: 92, stopAt: null, stopIdx: 2, delay: 0, incident: null, msgs: [], hist: [], queue: [] };
const browserLang = (): Lang => (navigator.language?.startsWith('ar') ? 'ar' : 'fr');

export const useStore = create<State>()(
  persist(
    (setState) => ({
      lang: browserLang(),
      theme: 'light',
      online: true, gps: false,
      ...(fresh as Pick<State, 'serviceId' | 'rame' | 'train' | 'speed' | 'stopAt' | 'stopIdx' | 'delay' | 'incident' | 'msgs' | 'hist' | 'queue'>),
      set: (p) => setState(p),
      reset: () => setState({ ...fresh } as Partial<State>),
    }),
    { name: 'mahatta-conducteur', storage: createJSONStorage(() => idb), version: 2,
      migrate: (state) => ({ ...(state as object), theme: 'light' }) as State },
  ),
);

export type { Cause };
