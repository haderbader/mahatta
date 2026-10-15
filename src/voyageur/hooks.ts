import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { LineKey, LineStatus } from '../../shared/network.ts';

export interface LiveTrain { n: string; line: LineKey; from: string; to: string; progress: number; stopped: boolean }
export interface Network {
  status: Partial<Record<LineKey, LineStatus>>;
  delays: Partial<Record<LineKey, number>>;
  trains: LiveTrain[];
}
const empty: Network = { status: {}, delays: {}, trains: [] };

/** Live line status, derived server-side from the drivers' declarations (Socket.IO push + initial fetch). */
export function useNetwork(): Network & { live: boolean } {
  const [net, setNet] = useState<Network>(empty);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let off = false;
    const load = () => fetch('/api/network').then((r) => r.json()).then((n: Network) => !off && setNet(n)).catch(() => undefined);
    void load();
    const s = io({ query: { pax: '1' } });
    s.on('connect', () => { setLive(true); void load(); });
    s.on('disconnect', () => setLive(false));
    s.on('network', (n: Network) => setNet(n));
    return () => { off = true; s.disconnect(); };
  }, []);
  return { ...net, live };
}

export function useMinutes() {
  const calc = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const [m, set] = useState(calc);
  useEffect(() => { const i = setInterval(() => set(calc()), 15_000); return () => clearInterval(i); }, []);
  return m;
}
export const hm = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');
};
