import { io, type Socket } from 'socket.io-client';
import type { DriverEvent, EventKind, Tr } from '../shared/domain.ts';
import { useStore, type Msg } from './store.ts';

export const isOnline = () => useStore.getState().online && navigator.onLine;

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
}

export const startService = (cabPayload: string, train: string) =>
  post<{ service: { id: number; rame: string }; messages: { id: number; created_at: number; fr: string; ar: string; acked_at: number | null }[] }>('/api/services', { cabPayload, train });
export const endService = (id: number) => post(`/api/services/${id}/end`, {});

const markSent = (clientId: string) =>
  useStore.setState((s) => ({
    hist: s.hist.map((h) => (h.clientId === clientId ? { ...h, sent: true } : h)),
    incident: s.incident && s.queue.length <= 1 ? { ...s.incident, sent: true } : s.incident,
  }));

/** Records an event locally first, then delivers it; undelivered events wait in the persisted queue. */
export async function sendEvent(kind: EventKind, data: Record<string, unknown>, label: Tr): Promise<boolean> {
  const ev: DriverEvent = { clientId: crypto.randomUUID(), kind, at: Date.now(), data };
  useStore.setState((s) => ({ hist: [...s.hist, { at: ev.at, label, clientId: ev.clientId, sent: false }] }));
  const id = useStore.getState().serviceId;
  if (id && isOnline()) {
    try {
      await post(`/api/services/${id}/events`, ev);
      markSent(ev.clientId);
      return true;
    } catch { /* fall through to the queue */ }
  }
  useStore.setState((s) => ({ queue: [...s.queue, ev] }));
  return false;
}

let flushing = false;
export async function flush(): Promise<number> {
  const id = useStore.getState().serviceId;
  if (flushing || !id || !isOnline()) return 0;
  flushing = true;
  let n = 0;
  try {
    for (const ev of [...useStore.getState().queue]) {
      await post(`/api/services/${id}/events`, ev);
      useStore.setState((s) => ({ queue: s.queue.filter((q) => q.clientId !== ev.clientId) }));
      markSent(ev.clientId);
      n++;
    }
    if (n) useStore.setState((s) => ({ incident: s.incident ? { ...s.incident, sent: true } : null }));
  } catch { /* still offline: retry on next trigger */ } finally { flushing = false; }
  return n;
}

let socket: Socket | null = null;
export function connectSocket(serviceId: number, onMessage: (m: Msg) => void) {
  socket?.disconnect();
  socket = io({ query: { service: String(serviceId) }, autoConnect: isOnline() });
  socket.on('message', (m: { id: number; fr: string; ar: string; created_at: number }) =>
    onMessage({ id: m.id, at: m.created_at, fr: m.fr, ar: m.ar, ack: false }));
  socket.on('connect', () => void flush());
  return socket;
}
export const syncSocket = () => {
  if (!socket) return;
  if (isOnline()) socket.connect(); else socket.disconnect();
};
export const dropSocket = () => { socket?.disconnect(); socket = null; };
