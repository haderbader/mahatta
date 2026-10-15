import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export interface Inc { cause: string; sub: number | null; est: number; at: number }
export interface Svc { id: number; train: string; rame: string; startedAt: number; incident: Inc | null; lastEventAt: number; pending: number }
export interface State { services: Svc[]; stats: { declarations: number; resolved: number; byCause: Record<string, number>; avgStopMin: number } }
export interface Ev { id?: number; train: string; kind: string; at: number; data: Record<string, unknown>; pax?: { fr: string; ar: string } }
export interface Msg { id: number; train: string; fr: string; ar: string; created_at: number; acked_at: number | null }
export interface Rep { id: number; category: string; text: string | null; train: string | null; created_at: number }

const empty: State = { services: [], stats: { declarations: 0, resolved: 0, byCause: {}, avgStopMin: 0 } };

/** One fetch + Socket.IO push: any event triggers a refresh of the derived server state. */
export function useCentre() {
  const [state, setState] = useState<State>(empty);
  const [events, setEvents] = useState<Ev[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reports, setReports] = useState<Rep[]>([]);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let off = false;
    const load = async () => {
      const [s, c] = await Promise.all([fetch('/api/centre/state').then((r) => r.json()), fetch('/api/centre').then((r) => r.json())]);
      if (off) return;
      setState(s); setEvents(c.events); setMsgs(c.messages); setReports(c.reports ?? []);
    };
    void load().catch(() => undefined);
    const sock = io({ query: { centre: '1' } });
    sock.on('connect', () => { setLive(true); void load(); });
    sock.on('disconnect', () => setLive(false));
    for (const e of ['event', 'service', 'service-end', 'message', 'report']) sock.on(e, () => void load());
    return () => { off = true; sock.disconnect(); };
  }, []);
  return { state, events, msgs, reports, live };
}

export const sendMessage = (train: string, fr: string, ar: string) =>
  fetch('/api/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ train, fr, ar }) });
