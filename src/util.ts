import { useEffect, useState } from 'react';
import type { Lang, Tr } from '../shared/domain.ts';
import { S } from './strings.ts';
import { useStore } from './store.ts';

export const useLang = (): Lang => useStore((s) => s.lang);
export const tr = (o: Tr, l: Lang) => o[l] ?? o.fr;
export const useT = () => {
  const l = useLang();
  return (k: keyof typeof S) => tr(S[k], l);
};
export const hm = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
export function useNow(every = 1000) {
  const [n, set] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => set(Date.now()), every); return () => clearInterval(i); }, [every]);
  return n;
}
export const ICONS: Record<string, string> = {
  depart: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  slow: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l-4-5"/>',
  pn: '<path d="M3 6l18 12M21 6L3 18"/>',
  acc: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  panne: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  infra: '<rect x="8" y="2" width="8" height="14" rx="2"/><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="11" r="1.5"/><path d="M12 16v6"/>',
  exploit: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  voy: '<circle cx="9" cy="7" r="3"/><path d="M3 21a6 6 0 0 1 12 0M17 11v6M14 14h6"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
};
