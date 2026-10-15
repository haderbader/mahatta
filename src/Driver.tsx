import { useCallback, useEffect, useState } from 'react';
import { CAUSES, TRAINS, parseCab, paxMessage, type Tr } from '../shared/domain.ts';
import { useStore, type Msg } from './store.ts';
import { useT, useLang, tr, hm, mmss, useNow } from './util.ts';
import { Icon } from './Icon.tsx';
import { Scan } from './Scan.tsx';
import { S } from './strings.ts';
import { connectSocket, dropSocket, endService, flush, sendEvent, startService, syncSocket, isOnline } from './api.ts';

const T = (fr: string, ar: string): Tr => ({ fr, ar });

function TopControls({ light }: { light?: boolean }) {
  const t = useT();
  const { lang, theme, set } = useStore();
  const st = light ? { background: 'var(--panel2)', color: 'var(--ink)' } : undefined;
  return (<>
    <button className="pill ghost" style={st} onClick={() => set({ lang: lang === 'fr' ? 'ar' : 'fr' })}>{lang === 'fr' ? 'العربية' : 'Français'}</button>
    <button className="pill ghost" style={st} onClick={() => set({ theme: theme === 'dark' ? 'light' : 'dark' })}>{theme === 'dark' ? t('day') : t('night')}</button>
  </>);
}

function Login() {
  const t = useT();
  const lang = useLang();
  const set = useStore((s) => s.set);
  const [cab, setCab] = useState<{ rame: string; payload: string } | null>(null);
  const [train, setTrain] = useState<string | null>(null);
  const [error, setError] = useState('');

  const onScan = useCallback((payload: string) => {
    const c = parseCab(payload);
    if (!c) { setError(S.badCab[lang]); return; }
    setError(''); setCab({ rame: c.rame, payload });
  }, [lang]);

  const go = async () => {
    if (!cab || !train) return;
    try {
      const r = await startService(cab.payload, train);
      set({ serviceId: r.service.id, rame: r.service.rame, train: TRAINS.find((x) => x.n === train)!,
        msgs: r.messages.map((m) => ({ id: m.id, at: m.created_at, fr: m.fr, ar: m.ar, ack: m.acked_at !== null })) });
    } catch { setError(t('apiDown')); }
  };

  return (
    <div className="login">
      <div className="prompt"><img className="logo" src="/logo.png" alt="SNTF" width={122} height={64} /><div className="btnrow"><TopControls light /></div></div>
      <h1 style={{ margin: 0, font: '600 48px/1 var(--display)' }}>{t('service')}</h1>
      <div className="card"><div className="step"><span className={`n ${cab ? 'done' : ''}`}>1</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b style={{ fontSize: 20 }}>{t('scanCab')}</b>
          {cab ? <div className="state st-run">✓ {t('scanned')} : <span>Rame {cab.rame} · cabine A</span></div>
            : <Scan label={t('scanCab')} demoRame="Z-217" onResult={onScan} />}
          {error && <span className="chip c-bad">{error}</span>}
        </div></div></div>
      <div className="card"><div className="step"><span className={`n ${train ? 'done' : ''}`}>2</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b style={{ fontSize: 20 }}>{t('chooseTrain')}</b>
          <div className="trains">{TRAINS.map((x) => (
            <button key={x.n} className="trainopt" aria-pressed={train === x.n} onClick={() => setTrain(x.n)}>
              <span><b>{x.n}</b> &nbsp;{tr(x.r, lang)}</span><span style={{ font: '600 24px var(--display)' }}>{x.h}</span>
            </button>))}</div>
        </div></div></div>
      <div className="card"><dl className="kv"><dt>{t('driver')}</dt><dd>CDT-0458 · K. Benali</dd></dl></div>
      <button className="btn pri" disabled={!(cab && train)} style={{ opacity: cab && train ? 1 : 0.5 }} onClick={go}>{t('start')}</button>
    </div>
  );
}

type Sheet = { kind: 'cause'; k: string } | { kind: 'swap' } | { kind: 'end' } | null;

function Main() {
  const t = useT();
  const lang = useLang();
  const s = useStore();
  const { set } = s;
  const now = useNow();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState('');
  const say = (x: string) => { setToast(x); setTimeout(() => setToast(''), 2800); };
  const tn = s.train!;
  const stopped = s.speed === 0;
  const inc = s.incident;
  const cause = inc ? CAUSES.find((c) => c.k === inc.causeK)! : null;

  useEffect(() => {
    if (!s.serviceId) return;
    connectSocket(s.serviceId, (m) => {
      const cur = useStore.getState().msgs;
      if (!cur.some((x) => x.id === m.id)) set({ msgs: [...cur, m] });
    });
    return dropSocket;
  }, [s.serviceId, set]);

  useEffect(() => {
    const sync = () => { syncSocket(); void flush(); };
    addEventListener('online', sync); addEventListener('offline', sync);
    sync();
    return () => { removeEventListener('online', sync); removeEventListener('offline', sync); };
  }, [s.online]);

  // Simulated speed ramp after a restart (the prototype's behaviour), unless real GPS drives speed.
  useEffect(() => {
    if (s.gps || s.speed === 0 || s.speed >= 92 || inc) return;
    const i = setTimeout(() => set({ speed: Math.min(92, s.speed + 4) }), 1000);
    return () => clearTimeout(i);
  }, [s.speed, s.gps, inc, set]);

  useEffect(() => {
    if (!s.gps || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((p) => {
      const v = Math.round((p.coords.speed ?? 0) * 3.6);
      set({ speed: v, stopAt: v === 0 ? useStore.getState().stopAt ?? Date.now() : null });
    }, () => set({ gps: false }), { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(id);
  }, [s.gps, set]);

  const remind = stopped && !inc && s.stopAt !== null && now - s.stopAt > 60000;
  const label = (k: keyof typeof S) => S[k];
  const sentToast = (ok: boolean) => say(ok ? t('sent') : t('pending'));

  const extend = async (m: number) => {
    set({ incident: { ...inc!, est: inc!.est + m, sent: false }, delay: s.delay + m });
    sentToast(await sendEvent('extend', { minutes: m }, T(`Durée prolongée de ${m} min`, `تمديد ${m} د`)));
  };
  const resume = async () => {
    set({ incident: null, speed: 45, stopAt: null });
    sentToast(await sendEvent('resume', {}, label('resume')));
  };
  const ack = async (m: Msg) => {
    set({ msgs: s.msgs.map((x) => (x.id === m.id ? { ...x, ack: true } : x)) });
    await sendEvent('ack', { messageId: m.id }, T('Message lu', 'رسالة مقروءة'));
  };
  const toggleNet = () => { set({ online: !s.online }); };
  useEffect(() => { if (s.online) void flush().then((n) => n && say(`${n} · ${t('sent')}`)); }, [s.online]); // eslint-disable-line

  return (<>
    <header className="top">
      <img className="logo" src="/logo.png" alt="SNTF" width={65} height={34} />
      <div className="tid"><b>{tn.n} · {tr(tn.r, lang)}</b><span>Rame {s.rame} · CDT-0458</span></div>
      <div className="spacer" />
      <button className={`pill ${isOnline() ? 'net-on' : 'net-off'}`} onClick={toggleNet}><i />{isOnline() ? t('net') : t('offline')}{s.queue.length ? ` · ${s.queue.length}` : ''}</button>
      <TopControls />
      <span className="clock">{hm(now)}</span>
    </header>
    {remind && <div className="alertbar pulse">⚠ {t('remind')}</div>}
    <div className="grid">
      <section className="card">
        <h2>{t('trip')}</h2>
        <div><span className="big">{s.speed}</span> <span className="status">{t('speed')}</span></div>
        <div className={`state ${stopped ? 'st-stop' : 'st-run'}`}>{stopped ? <>■ {t('stopped')} <span>{mmss(now - (s.stopAt ?? now))}</span></> : <>▶ {t('running')}</>}</div>
        <dl className="kv"><dt>{t('next')}</dt><dd>{tn.stops[s.stopIdx][0]}</dd><dt>{t('delay')}</dt>
          <dd style={{ color: s.delay ? 'var(--warn)' : 'var(--ok)' }}>{s.delay ? `+${s.delay} ${t('minutes')}` : t('onTime')}</dd></dl>
        <div className="stops">{tn.stops.map((p, i) => (
          <div key={p[0]} className={`stop ${i < s.stopIdx ? 'past' : i === s.stopIdx ? 'next' : ''}`}><span>{p[0]}</span><span>{p[1]}</span></div>))}</div>
      </section>

      <section className="card mid">
        {inc && cause ? (
          <div className="incident">
            <div className="row"><div><span className="status">{t('since')} {hm(inc.at)}</span>
              <h3>{tr(cause.n, lang)}{inc.sub !== null ? ' · ' + tr(cause.sub[inc.sub], lang) : ''}</h3></div>
              <span className="timer">{mmss(now - inc.at)}</span></div>
            <div className="row"><span className="status">{t('dur')} : <b style={{ color: 'var(--ink)' }}>{inc.est ? `${inc.est} ${t('minutes')}` : t('unknown')}</b></span>
              <span className={`chip ${inc.sent ? 'c-ok' : 'c-warn'}`}>{inc.sent ? t('sent') : t('pending')}</span></div>
            <div className="preview"><h4 style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{t('preview')}</h4><p>{paxMessage(cause, inc.est)[lang]}</p></div>
            <div className="btnrow">
              <button className="btn" onClick={() => extend(5)}>+5 {t('minutes')}</button>
              <button className="btn" onClick={() => extend(10)}>+10 {t('minutes')}</button>
              <button className="btn" onClick={() => setSheet({ kind: 'cause', k: cause.k })}>{t('update')}</button>
              <button className="btn ok wide" onClick={resume}>▶ {t('resume')}</button>
            </div>
          </div>
        ) : (<>
          <div className="prompt"><div><p>{t('why')}</p><span className="status">{t('oneTap')}</span></div></div>
          <div className="causes">{CAUSES.map((c) => (
            <button key={c.k} className={`cause ${c.sens ? 'sensitive' : ''}`} onClick={() => setSheet({ kind: 'cause', k: c.k })}>
              <Icon k={c.k} /><span><b>{tr(c.n, lang)}</b><br /><small>{tr(c.s, lang)}</small></span></button>))}</div>
        </>)}
        <div className="foot"><button className="btn" onClick={() => setSheet({ kind: 'swap' })}>⇄ {t('rame')}</button><div className="spacer" />
          <button className="btn" onClick={() => setSheet({ kind: 'end' })}>{t('end')}</button></div>
        <div className="demo">{t('demo')}
          <button onClick={() => set(stopped ? { speed: 88, stopAt: null } : { speed: 0, stopAt: Date.now() - 55000 })}>{stopped ? t('simRun') : t('simStop')}</button>
          <button onClick={() => set({ gps: !s.gps })} aria-pressed={s.gps}>{t('gps')}{s.gps ? ' ✓' : ''}</button>
        </div>
      </section>

      <section className="card">
        <h2>{t('messages')}</h2>
        {s.msgs.slice().reverse().map((m) => (
          <div key={m.id} className={`msg ${m.ack ? '' : 'new'}`}><div className="h"><span>{hm(m.at)}</span><span>{m.ack ? t('acked') : ''}</span></div>
            <p>{m[lang]}</p>{!m.ack && <button onClick={() => ack(m)}>{t('ack')}</button>}</div>))}
        <h2>{t('queue')}</h2>
        <ul className="queue">{s.hist.length ? s.hist.slice().reverse().map((h) => (
          <li key={h.clientId}><span>{hm(h.at)} · {tr(h.label, lang)}</span><span className={`chip ${h.sent ? 'c-ok' : 'c-warn'}`}>{h.sent ? t('sent') : t('pending')}</span></li>))
          : <li><span className="status">{t('none')}</span></li>}</ul>
      </section>
    </div>

    {sheet && <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSheet(null)}><div className="sheet" role="dialog" aria-modal="true">
      {sheet.kind === 'cause' && <CauseSheet k={sheet.k} onClose={() => setSheet(null)} onSent={sentToast} />}
      {sheet.kind === 'swap' && <SwapSheet onClose={() => setSheet(null)} onDone={(r) => say(`${t('swapDone')} ${r}`)} />}
      {sheet.kind === 'end' && <EndSheet onClose={() => setSheet(null)} />}
    </div></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </>);
}

function CauseSheet({ k, onClose, onSent }: { k: string; onClose: () => void; onSent: (ok: boolean) => void }) {
  const t = useT();
  const lang = useLang();
  const { incident, stopAt, delay, set } = useStore();
  const c = CAUSES.find((x) => x.k === k)!;
  const [sub, setSub] = useState<number | null>(incident?.causeK === k ? incident.sub : null);
  const [est, setEst] = useState<number | null>(incident?.causeK === k ? incident.est : null);
  const send = async () => {
    const at = incident?.at ?? stopAt ?? Date.now();
    set({ incident: { causeK: k, sub, est: est ?? 0, at, sent: false }, speed: 0, stopAt: stopAt ?? at, delay: est ? Math.max(delay, est) : delay });
    onClose();
    const label: Tr = { fr: tr(c.n, 'fr') + (sub !== null ? ' · ' + c.sub[sub].fr : ''), ar: c.n.ar };
    onSent(await sendEvent(incident ? 'modify' : 'declare', { cause: k, sub, est: est ?? 0 }, label));
  };
  return (<>
    <div className="prompt"><h3>{tr(c.n, lang)}</h3><span className="status">{hm(Date.now())}</span></div>
    <h4>{t('detail')}</h4>
    <div className="opts">{c.sub.map((x, i) => <button key={i} className="opt" aria-pressed={sub === i} onClick={() => setSub(sub === i ? null : i)}>{tr(x, lang)}</button>)}</div>
    <h4>{t('dur')}</h4>
    <div className="opts">{[5, 10, 15, 30].map((m) => <button key={m} className="opt" aria-pressed={est === m} onClick={() => setEst(m)}>{m} {t('minutes')}</button>)}
      <button className="opt" aria-pressed={est === 0} onClick={() => setEst(0)}>{t('unknown')}</button></div>
    <div className="preview"><h4>{t('preview')}</h4><p>{paxMessage(c, est ?? 0)[lang]}</p>{c.sens && <span className="note">{t('sensitiveNote')}</span>}</div>
    <div className="btnrow"><button className="btn" onClick={onClose}>{t('cancel')}</button><button className="btn pri" onClick={send}>{t('send')}</button></div>
  </>);
}

function SwapSheet({ onClose, onDone }: { onClose: () => void; onDone: (rame: string) => void }) {
  const t = useT();
  const { rame, train, set } = useStore();
  const [next, setNext] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const onScan = useCallback((p: string) => {
    const c = parseCab(p);
    if (!c) return setErr(t('badCab'));
    if (c.rame === rame) return setErr(t('sameRame'));
    setErr(''); setNext(c.rame);
  }, [rame, t]);
  const confirm = async () => {
    if (!next) return;
    set({ rame: next }); onClose(); onDone(next);
    await sendEvent('swap', { from: rame, to: next }, T(`Bascule ${rame} → ${next}`, `تغيير ${rame} ← ${next}`));
  };
  return (<>
    <h3>⇄ {t('rame')}</h3>
    <dl className="kv"><dt>{t('train')}</dt><dd>{train!.n}</dd><dt>{t('rameCur')}</dt><dd>{rame}</dd></dl>
    {next ? <><div className="state st-run">✓ {t('rameNew')} : {next}</div><p className="status" style={{ margin: 0 }}>{t('keep')}</p></>
      : <Scan label={t('scanNew')} demoRame={rame === 'Z-217' ? 'Z-305' : 'Z-217'} onResult={onScan} />}
    {err && <span className="chip c-bad">{err}</span>}
    <div className="btnrow"><button className="btn" onClick={onClose}>{t('cancel')}</button>
      <button className="btn pri" disabled={!next} style={{ opacity: next ? 1 : 0.5 }} onClick={confirm}>{t('confirm')}</button></div>
  </>);
}

function EndSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { serviceId, reset } = useStore();
  const end = async () => {
    await flush();
    if (serviceId && isOnline()) await endService(serviceId).catch(() => undefined);
    onClose(); reset();
  };
  return (<>
    <h3>{t('end')}</h3><p style={{ margin: 0, fontSize: 18 }}>{t('endConfirm')}</p>
    <div className="btnrow"><button className="btn" onClick={onClose}>{t('cancel')}</button><button className="btn pri" onClick={end}>{t('yes')}</button></div>
  </>);
}

export function Driver() {
  const serviceId = useStore((s) => s.serviceId);
  return <div className="wrap">{serviceId ? <Main /> : <Login />}</div>;
}
