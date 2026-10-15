import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { CAUSES, TRAINS } from '../shared/domain.ts';
import { useT, useLang, tr, hm } from './util.ts';

interface Ev { id?: number; train: string; kind: string; at: number; data: Record<string, unknown>; pax?: { fr: string; ar: string } }
interface Svc { id: number; rame: string; train: string }
interface Msg { id: number; train: string; fr: string; ar: string; created_at: number; acked_at: number | null }

/** Minimal control-room view: live feed of driver declarations + message to a train. */
export function Centre() {
  const t = useT();
  const lang = useLang();
  const [events, setEvents] = useState<Ev[]>([]);
  const [services, setServices] = useState<Svc[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [train, setTrain] = useState(TRAINS[0].n);
  const [fr, setFr] = useState('');
  const [ar, setAr] = useState('');

  useEffect(() => {
    const load = () => fetch('/api/centre').then((r) => r.json()).then((d) => {
      setServices(d.services); setMsgs(d.messages);
      setEvents((d.events as (Ev & { received_at: number })[]).map((e) => ({ ...e })));
    });
    void load();
    const s = io({ query: { centre: '1' } });
    s.on('event', (e: Ev) => { setEvents((x) => [e, ...x].slice(0, 50)); });
    s.on('service', () => void load());
    s.on('service-end', () => void load());
    s.on('message', () => void load());
    return () => { s.disconnect(); };
  }, []);

  const send = async () => {
    if (!fr || !ar) return;
    await fetch('/api/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ train, fr, ar }) });
    setFr(''); setAr('');
  };
  const causeName = (k: unknown) => { const c = CAUSES.find((x) => x.k === k); return c ? tr(c.n, lang) : ''; };

  return (
    <div className="page">
      <h1 style={{ margin: 0, font: '600 40px var(--display)' }}>{t('ctrlTitle')}</h1>
      <div className="card"><h2>{t('activeSvc')}</h2>
        {services.length ? services.map((s) => <div key={s.id} className="msg"><b>{s.train}</b> · Rame {s.rame}</div>) : <span className="status">{t('noService')}</span>}</div>
      <div className="card"><h2>{t('sendMsg')}</h2>
        <select className="field" value={train} onChange={(e) => setTrain(e.target.value)}>{TRAINS.map((x) => <option key={x.n} value={x.n}>{x.n} · {tr(x.r, lang)}</option>)}</select>
        <input className="field" placeholder={t('msgFr')} value={fr} onChange={(e) => setFr(e.target.value)} />
        <input className="field" dir="rtl" placeholder={t('msgAr')} value={ar} onChange={(e) => setAr(e.target.value)} />
        <button className="btn pri" onClick={send}>{t('send')}</button>
        {msgs.map((m) => <div key={m.id} className="msg"><div className="h"><span>{m.train} · {hm(m.created_at)}</span>
          {m.acked_at && <span className="chip c-ok">{t('acknowledged')} {hm(m.acked_at)}</span>}</div><p>{m[lang]}</p></div>)}</div>
      <div className="card"><h2>{t('feed')}</h2>
        {events.map((e, i) => (
          <div key={e.id ?? `${e.at}-${i}`} className="msg"><div className="h"><span>{e.train} · {hm(e.at)}</span><span className="chip c-warn">{e.kind}</span></div>
            <p>{causeName(e.data.cause)} {e.data.est ? `· ${e.data.est} min` : ''}{e.kind === 'extend' ? `+${e.data.minutes} min` : ''}{e.kind === 'swap' ? `${e.data.from} → ${e.data.to}` : ''}</p>
            {e.pax && <span className="status">{t('paxSees')} : {e.pax[lang]}</span>}</div>))}</div>
    </div>
  );
}
