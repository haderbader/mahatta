import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Drawer } from 'vaul';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';
import { Search, ArrowUpDown, Bell, BellOff, Star, Clock, Train as TrainIcon, ScanLine, ShieldCheck, ShieldX, Plus } from 'lucide-react';
import { COORDS, LINES, LINE_KEYS, STATIONS, STATION_NAMES, type LineKey, type Status } from '../../shared/network.ts';
import { computeRoutes, type Route } from '../../shared/routing.ts';
import { PRODUCTS } from '../../shared/tickets.ts';
import { usePax } from './store.ts';
import { useNetwork, useMinutes, hm, type Network } from './hooks.ts';
import { departures } from './data.ts';
import { MapView } from './MapView.tsx';
import { LineBadge, StatusPill, Header, Chev, BASE } from './ui.tsx';

type Lang = 'fr' | 'ar';
const st = (n: Network, k: LineKey): Status => n.status[k]?.status ?? 'ok';
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`card ${className}`}>{children}</div>;
const Sec = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="mt-5 mb-2 flex items-baseline justify-between px-1"><h2 className="m-0 font-display text-lg font-semibold uppercase tracking-wide text-[var(--muted)]">{children}</h2>{right}</div>);

function LiveAlert({ n, k }: { n: Network; k: LineKey }) {
  const { i18n, t } = useTranslation();
  const s = n.status[k];
  if (!s || s.status === 'ok') return null;
  const lang = i18n.language as Lang;
  const bad = s.status === 'bad';
  return (
    <div className="flex items-start gap-3 rounded-2xl p-3" style={{ background: bad ? 'var(--bad-s)' : 'var(--warn-s)', color: bad ? 'var(--bad)' : 'var(--warn)' }}>
      <LineBadge k={k} size={28} />
      <div className="grow text-[var(--ink)]"><b className="block">{s.title?.[lang]}</b><p className="m-0 text-sm">{s.detail?.[lang]}</p>
        {s.since && <p className="m-0 mt-1 text-xs text-[var(--muted)]">{t('live.from', { train: s.train, time: hm(new Date(s.since).getHours() * 60 + new Date(s.since).getMinutes()) })}</p>}</div>
    </div>
  );
}

function DepRow({ d, n, now }: { d: ReturnType<typeof departures>[number]; n: Network; now: number }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const late = d.delay;
  const bad = st(n, d.k) === 'bad';
  return (
    <button onClick={() => nav(`${BASE}/ligne/${d.k}`)} className="flex w-full items-center gap-3 border-t border-[var(--line)] p-3 text-start first:border-0">
      <LineBadge k={d.k} />
      <span className="grow"><b>{d.dest}</b><span className="block text-xs text-[var(--muted)]">{t('station.platform', { n: d.platform })}{d.train ? ` · ${d.train}` : ''}</span></span>
      <span className="num text-end">
        {bad ? <span className="font-bold text-[var(--bad)]">{t('station.canc')}</span> : d.times.slice(0, 2).map((x, i) => {
          const wait = x + late - now;
          return <span key={i} className={`block ${i ? 'text-sm text-[var(--muted)]' : 'font-display text-xl font-semibold'}`}>
            {wait <= 0 ? '0' : wait < 60 ? t('itin.min', { n: wait }) : hm(x + late)}
            {late > 0 && i === 0 && <span className="ms-1 text-xs font-bold text-[var(--warn)]">+{late}</span>}</span>;
        })}
      </span>
    </button>
  );
}

/* ---------- Home ---------- */
export function HomeScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const net = useNetwork();
  const now = useMinutes();
  const { favs, set, from } = usePax();
  const station = favs[0] ?? from;
  const box = useRef<HTMLDivElement>(null);
  const [H, setH] = useState(600);
  const [snap, setSnap] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  // sheet is H tall and positioned by translateY: expanded / half / peek
  const snaps = [0, Math.round(H * 0.5), Math.max(0, H - 150)];
  const top = 0, bottom = snaps[2];
  const alerts = LINE_KEYS.filter((k) => net.status[k] && net.status[k]!.status !== 'ok');
  return (
    <div ref={box} className="relative h-full overflow-hidden">
      <MapView className="absolute inset-0" trains={net.trains} focus={[station]} onStation={(s) => nav(`${BASE}/gare/${encodeURIComponent(s)}`)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <img src="/logo.png" alt="SNTF" width={78} height={41} className="rounded-xl bg-white/90 p-1.5" />
        <span className={`pointer-events-auto rounded-full px-3 py-1.5 text-xs font-bold ${net.live ? 'bg-[var(--ok-s)] text-[var(--ok)]' : 'bg-[var(--bad-s)] text-[var(--bad)]'}`}>
          ● {net.live ? t('home.live') : t('offline')}</span>
      </div>
      <motion.div drag="y" dragElastic={0.05} dragMomentum={false} dragConstraints={{ top: top, bottom: bottom }}
        animate={{ y: snaps[snap] }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        onDragEnd={(_, i) => {
          const cur = snaps[snap] + i.offset.y + i.velocity.y * 0.15;
          const next = snaps.reduce((best, v, idx) => (Math.abs(v - cur) < Math.abs(snaps[best] - cur) ? idx : best), 0);
          setSnap(next);
        }}
        className="absolute inset-x-0 top-0 z-20 flex flex-col rounded-t-3xl border border-[var(--line)] bg-[var(--bg)] shadow-2xl"
        style={{ height: H }}>
        <div className="mx-auto my-2 h-1.5 w-10 shrink-0 cursor-grab rounded-full bg-[var(--line)]" />
        <div className="min-h-0 grow overflow-y-auto px-4 pb-24" onPointerDownCapture={(e) => e.stopPropagation()}>
              <button onClick={() => nav(`${BASE}/itineraire`)} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 text-start text-lg font-semibold">
                <Search size={20} />{t('home.where')}</button>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {favs.slice(0, 4).map((f, i) => (
                  <button key={f} onClick={() => { set({ from: f, to: favs[(i + 1) % favs.length] ?? f }); nav(`${BASE}/itineraire`); }}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-semibold">
                    <Star size={14} className="text-[var(--color-accent)]" />{f}</button>))}
              </div>
              <div className="mt-4 space-y-2">
                {alerts.length ? alerts.map((k) => <LiveAlert key={k} n={net} k={k} />)
                  : <p className="m-0 rounded-2xl p-3 text-sm font-semibold" style={{ background: 'var(--ok-s)', color: 'var(--ok)' }}>✓ {t('home.normal')}</p>}
              </div>
              <Sec right={<button className="text-sm font-bold text-[var(--color-accent)]" onClick={() => nav(`${BASE}/gare/${encodeURIComponent(station)}`)}>{t('home.seeStation')}</button>}>
                {t('home.myStation')} · {station}</Sec>
              <Card>{departures(station, now, net.delays, 2).slice(0, 4).map((d, i) => <DepRow key={i} d={d} n={net} now={now} />)}</Card>
              <Sec right={<button className="text-sm font-bold text-[var(--color-accent)]" onClick={() => nav(`${BASE}/trafic`)}>{t('home.allTraffic')}</button>}>{t('home.myLines')}</Sec>
              <div className="grid grid-cols-4 gap-2">
                {(['E', 'O', 'A', 'GO'] as LineKey[]).map((k) => (
                  <button key={k} onClick={() => nav(`${BASE}/ligne/${k}`)} className="card flex flex-col items-center gap-1.5 p-3">
                    <LineBadge k={k} size={34} status={st(net, k)} /><span className="text-xs font-semibold text-[var(--muted)]">{t(`st.${st(net, k)}Short`)}</span></button>))}
              </div>
            </div>
      </motion.div>
    </div>
  );
}

/* ---------- Itinerary ---------- */
function StationInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <input list="gares" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off"
    className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-lg font-semibold" />;
}
const routeStore: { sel: Route | null } = { sel: null };

export function ItineraryScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const net = useNetwork();
  const now = useMinutes();
  const { from, to, set } = usePax();
  const blocked = LINE_KEYS.filter((k) => st(net, k) === 'bad' && LINES[k].kind === 'main' && false);
  const routes = useMemo(() => computeRoutes(from, to, now, net.delays, blocked), [from, to, now, net.delays]); // eslint-disable-line react-hooks/exhaustive-deps
  const known = STATIONS[from] && STATIONS[to];
  return (
    <div className="pb-6">
      <Header title={t('itin.title')} />
      <datalist id="gares">{STATION_NAMES.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="px-4">
        <div className="card flex items-center gap-2 p-3">
          <div className="grid grow gap-2"><StationInput value={from} onChange={(v) => set({ from: v })} label={t('itin.from')} />
            <StationInput value={to} onChange={(v) => set({ to: v })} label={t('itin.to')} /></div>
          <button aria-label={t('itin.swap')} onClick={() => set({ from: to, to: from })} className="grid size-11 place-items-center rounded-full bg-[var(--acc-s)] text-[var(--color-accent)]"><ArrowUpDown size={20} /></button>
        </div>
        {known && <MapView className="mt-3 h-40 overflow-hidden rounded-2xl border border-[var(--line)]" focus={[from, to]} trains={net.trains} />}
        {!routes.length ? (
          <div className="card mt-4 p-4"><b>{t('itin.none')}</b><p className="m-0 text-sm text-[var(--muted)]">{t('itin.noneHint')}</p></div>
        ) : (<>
          <Sec>{t('itin.results', { n: routes.length })}</Sec>
          <div className="space-y-3">{routes.map((r, i) => (
            <motion.button key={`${r.dep}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => { routeStore.sel = r; nav(`${BASE}/trajet`); }} className="card w-full p-4 text-start">
              <div className="flex items-center gap-3">
                <span className="num font-display text-2xl font-semibold">{hm(r.dep)} → {hm(r.arr)}</span>
                <span className="grow" /><span className="num font-semibold">{t('itin.min', { n: r.dur })}</span><Chev />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {r.legs.map((l, j) => <LineBadge key={j} k={l.k} status={st(net, l.k)} />)}
                <span className="text-sm text-[var(--muted)]">{r.legs.length === 1 ? t('itin.direct') : t('itin.change')}</span>
                {i === 0 && <span className="rounded-full bg-[var(--acc-s)] px-2 py-0.5 text-xs font-bold text-[var(--color-accent)]">{t('itin.fastest')}</span>}
                {r.delay > 0 && <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'var(--warn-s)', color: 'var(--warn)' }}>{t('itin.delay', { n: r.delay })}</span>}
              </div>
            </motion.button>))}</div>
          <p className="mt-3 px-1 text-xs text-[var(--muted)]">{t('itin.theory')}</p>
        </>)}
      </div>
    </div>
  );
}

export function RouteDetailScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const net = useNetwork();
  const r = routeStore.sel;
  useEffect(() => { if (!r) nav(`${BASE}/itineraire`, { replace: true }); }, [r, nav]);
  if (!r) return null;
  const first = r.legs[0];
  const pr = r.legs.some((l) => LINES[l.k].kind === 'main') ? 'GL' : 'B1';
  return (
    <div className="pb-6">
      <Header title={`${first.a} → ${r.legs[r.legs.length - 1].b}`} />
      <div className="px-4">
        <MapView className="h-44 overflow-hidden rounded-2xl border border-[var(--line)]" focus={r.legs.flatMap((l) => [l.a, l.b])} trains={net.trains} />
        <Card className="mt-4 p-4">
          <ol className="m-0 list-none p-0">
            {r.legs.map((l, i) => (
              <li key={i} className="relative border-s-4 ps-4 pb-4 last:pb-0" style={{ borderColor: LINES[l.k].color }}>
                <div className="flex items-center gap-2"><LineBadge k={l.k} status={st(net, l.k)} /><b>{t('itin.towards', { d: l.dir })}</b></div>
                <p className="num m-0 mt-2 font-semibold">{hm(l.dep)} · {l.a}</p>
                <p className="m-0 text-sm text-[var(--muted)]">{t('itin.stops', { n: l.stops })}{l.delay ? ` · ${t('itin.delay', { n: l.delay })}` : ''}</p>
                <p className="num m-0 mt-1 font-semibold">{hm(l.arr)} · {l.b}</p>
                {i < r.legs.length - 1 && <p className="m-0 mt-2 text-sm font-semibold text-[var(--color-accent)]">{t('itin.via', { s: l.b })}</p>}
              </li>))}
          </ol>
        </Card>
        <button onClick={() => nav(`${BASE}/acheter?p=${pr}`)} className="mt-4 min-h-14 w-full rounded-2xl bg-[var(--color-accent)] text-lg font-bold text-white">{t('itin.buy')}</button>
        <button onClick={() => nav(`${BASE}/signaler`)} className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] font-semibold">{t('track.report')}</button>
      </div>
    </div>
  );
}

/* ---------- Station / Line / Traffic ---------- */
export function StationScreen() {
  const { t } = useTranslation();
  const { name = '' } = useParams();
  const nav = useNavigate();
  const net = useNetwork();
  const now = useMinutes();
  const { favs, set } = usePax();
  const fav = favs.includes(name);
  if (!STATIONS[name]) return <Header title={name} />;
  return (
    <div className="pb-6">
      <Header title={name} right={<button aria-label={t(fav ? 'station.unfav' : 'station.fav')} onClick={() => { set({ favs: fav ? favs.filter((f) => f !== name) : [name, ...favs] }); toast(t(fav ? 'station.unfav' : 'station.fav')); }}
        className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--card)]"><Star size={20} fill={fav ? 'currentColor' : 'none'} className="text-[var(--color-accent)]" /></button>} />
      <div className="px-4">
        <MapView className="h-40 overflow-hidden rounded-2xl border border-[var(--line)]" focus={[name]} trains={net.trains} />
        <div className="mt-3 flex flex-wrap gap-2">{STATIONS[name].map((k) => <button key={k} onClick={() => nav(`${BASE}/ligne/${k}`)}><LineBadge k={k} size={32} status={st(net, k)} /></button>)}</div>
        <Sec>{t('station.departures')}</Sec>
        <Card>{departures(name, now, net.delays, 2).map((d, i) => <DepRow key={i} d={d} n={net} now={now} />)}</Card>
        <button onClick={() => { set({ from: name }); nav(`${BASE}/itineraire`); }} className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--color-accent)] font-bold text-white">{t('tab.itin')}</button>
      </div>
    </div>
  );
}

export function LineScreen() {
  const { t, i18n } = useTranslation();
  const { key = 'E' } = useParams();
  const k = key as LineKey;
  const nav = useNavigate();
  const net = useNetwork();
  const { alerts, set } = usePax();
  const L = LINES[k];
  if (!L) return null;
  const on = !!alerts[k];
  const s = net.status[k];
  const lang = i18n.language as Lang;
  return (
    <div className="pb-6">
      <Header title={L.name} right={<button aria-label={t(on ? 'alerts.off' : 'alerts.on')} onClick={() => { set({ alerts: { ...alerts, [k]: !on } }); toast(t(on ? 'alerts.off' : 'alerts.on')); }}
        className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--card)]">{on ? <Bell size={20} className="text-[var(--color-accent)]" /> : <BellOff size={20} />}</button>} />
      <div className="px-4">
        <div className="flex items-center gap-3"><LineBadge k={k} size={40} status={st(net, k)} /><StatusPill s={st(net, k)} /></div>
        {s && s.status !== 'ok' && <p className="mt-3 rounded-2xl p-3 text-sm" style={{ background: s.status === 'bad' ? 'var(--bad-s)' : 'var(--warn-s)' }}><b>{s.title?.[lang]}</b><br />{s.detail?.[lang]}</p>}
        {k === 'Z' && <p className="mt-3 rounded-2xl p-3 text-sm" style={{ background: 'var(--acc-s)' }}><b>{t('traffic.works')}</b><br />{t('works.z')}</p>}
        <MapView className="mt-3 h-44 overflow-hidden rounded-2xl border border-[var(--line)]" focus={[L.stations[0], L.stations[L.stations.length - 1]]} trains={net.trains.filter((x) => x.line === k)} />
        <Sec>{t('line.stations')}</Sec>
        <Card className="p-4"><ol className="m-0 list-none p-0">{L.stations.map((s2) => (
          <li key={s2}><button onClick={() => nav(`${BASE}/gare/${encodeURIComponent(s2)}`)} className="relative flex min-h-11 w-full items-center gap-3 border-s-4 ps-4 text-start font-semibold" style={{ borderColor: L.color }}>
            <span className="absolute -start-[9px] size-3.5 rounded-full border-[3px] bg-[var(--card)]" style={{ borderColor: L.color }} />{s2}</button></li>))}</ol></Card>
      </div>
    </div>
  );
}

export function TrafficScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const net = useNetwork();
  const group = (kind: 'sub' | 'main') => LINE_KEYS.filter((k) => LINES[k].kind === kind);
  return (
    <div className="pb-6">
      <Header title={t('traffic.title')} />
      <div className="px-4">
        {(['sub', 'main'] as const).map((kind) => (<div key={kind}><Sec>{t(kind === 'sub' ? 'traffic.sub' : 'traffic.main')}</Sec>
          <Card>{group(kind).map((k) => (
            <button key={k} onClick={() => nav(`${BASE}/ligne/${k}`)} className="flex w-full items-center gap-3 border-t border-[var(--line)] p-3 text-start first:border-0">
              <LineBadge k={k} /><span className="grow font-semibold">{LINES[k].name}</span><StatusPill s={st(net, k)} short /><Chev /></button>))}</Card></div>))}
      </div>
    </div>
  );
}

/* ---------- Tickets ---------- */
interface TicketRow { id: string; product: string; validTo: number | null; tripsLeft: number | null; price: number }
const useTickets = () => {
  const id = usePax((s) => s.passengerId);
  const [rows, setRows] = useState<TicketRow[] | null>(null);
  const load = () => fetch(`/api/tickets?passengerId=${id}`).then((r) => r.json()).then(setRows).catch(() => setRows([]));
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return { rows, reload: load };
};

export function TicketsScreen() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { rows } = useTickets();
  return (
    <div className="pb-6">
      <Header title={t('tickets.title')} />
      <div className="space-y-3 px-4">
        {rows?.length === 0 && <p className="card m-0 p-4 text-[var(--muted)]">{t('tickets.none')}</p>}
        {rows?.map((r) => (
          <button key={r.id} onClick={() => nav(`${BASE}/billets/${r.id}`)} className="card flex w-full items-center gap-3 p-4 text-start">
            <TrainIcon className="text-[var(--color-accent)]" />
            <span className="grow"><b className="block">{t(`p.${r.product}`)}</b>
              <span className="text-sm text-[var(--muted)]">{r.tripsLeft !== null ? t('tickets.left', { n: r.tripsLeft }) : r.validTo ? t('tickets.until', { d: new Date(r.validTo).toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-FR') }) : ''}</span></span>
            <Chev /></button>))}
        <button onClick={() => nav(`${BASE}/acheter`)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] text-lg font-bold text-white"><Plus />{t('tickets.buy')}</button>
      </div>
    </div>
  );
}

export function TicketQrScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const pid = usePax((s) => s.passengerId);
  const [img, setImg] = useState('');
  const [left, setLeft] = useState(30);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true, exp = 0;
    const fetchToken = async () => {
      try {
        const r = await fetch(`/api/tickets/${id}/token?passengerId=${pid}`);
        if (!r.ok) throw new Error();
        const d = (await r.json()) as { token: string; expiresAt: number };
        exp = d.expiresAt;
        const url = await QRCode.toDataURL(d.token, { margin: 1, width: 360 });
        if (alive) { setImg(url); setErr(false); }
      } catch { if (alive) setErr(true); }
    };
    void fetchToken();
    const i = setInterval(() => {
      const s = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) void fetchToken();
    }, 500);
    return () => { alive = false; clearInterval(i); };
  }, [id, pid]);
  return (
    <div className="pb-6">
      <Header title={t('tickets.title')} />
      <div className="px-4 text-center">
        <Card className="mx-auto max-w-xs p-5">
          <div className="grid aspect-square place-items-center rounded-xl bg-white">
            {img && !err ? <img src={img} alt="QR" className="size-full" /> : <span className="p-4 text-sm text-neutral-500">{t(err ? 'tickets.offlineCode' : 'loading')}</span>}</div>
          <p className="num mt-3 mb-0 font-display text-3xl font-semibold">{left}s</p>
          <p className="m-0 text-sm text-[var(--muted)]">{t('tickets.refresh')}</p>
        </Card>
        <p className="mt-4 font-semibold">{t('tickets.show')}</p>
      </div>
    </div>
  );
}

export function BuyScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const pid = usePax((s) => s.passengerId);
  const [open, setOpen] = useState<string | null>(new URLSearchParams(location.search).get('p'));
  const [busy, setBusy] = useState(false);
  const p = PRODUCTS.find((x) => x.id === open);
  const pay = async () => {
    if (!p) return;
    setBusy(true);
    try {
      const r = await fetch('/api/tickets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passengerId: pid, product: p.id }) });
      if (!r.ok) throw new Error();
      toast.success(t('buy.done'));
      nav(`${BASE}/billets`, { replace: true });
    } catch { toast.error(t('offline')); } finally { setBusy(false); }
  };
  return (
    <div className="pb-6">
      <Header title={t('buy.title')} />
      <div className="space-y-3 px-4">
        {PRODUCTS.map((x) => (
          <button key={x.id} onClick={() => setOpen(x.id)} className="card flex w-full items-center gap-3 p-4 text-start">
            <span className="grow"><b className="block">{t(`p.${x.id}`)}</b><span className="text-sm text-[var(--muted)]">{t(`p.${x.id}.d`)}</span></span>
            <span className="num font-display text-2xl font-semibold">{x.price} <small className="text-sm">DA</small></span></button>))}
        <p className="m-0 px-1 text-xs text-[var(--muted)]">{t('buy.demo')}</p>
      </div>
      <Drawer.Root open={!!p} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] rounded-t-3xl bg-[var(--bg)] p-5 pb-8 outline-none">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--line)]" />
            <Drawer.Title className="m-0 font-display text-2xl font-semibold">{p && t(`p.${p.id}`)}</Drawer.Title>
            <Drawer.Description className="mt-1 text-[var(--muted)]">{p && t(`p.${p.id}.d`)}</Drawer.Description>
            <button disabled={busy} onClick={pay} className="mt-5 min-h-14 w-full rounded-2xl bg-[var(--color-accent)] text-lg font-bold text-white disabled:opacity-60">{p && t('buy.pay', { p: p.price })}</button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

/* ---------- Controller (real validation of the rotating signed code) ---------- */
export function ControlScreen() {
  const { t } = useTranslation();
  const [res, setRes] = useState<null | { valid: boolean; reason?: string; product?: string; tripsLeft?: number | null }>(null);
  const [scan, setScan] = useState(false);
  const [manual, setManual] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const check = async (token: string) => {
    const r = await fetch('/api/tickets/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: token.trim() }) });
    setRes(await r.json());
  };
  useEffect(() => {
    if (!scan || !video.current) return;
    const s = new QrScanner(video.current, (r) => { s.stop(); setScan(false); void check(r.data); }, { returnDetailedScanResult: true, preferredCamera: 'environment' });
    s.start().catch(() => setScan(false));
    return () => { s.stop(); s.destroy(); };
  }, [scan]);
  return (
    <div className="pb-6">
      <Header title={t('control.title')} />
      <div className="space-y-3 px-4">
        {scan ? <video ref={video} playsInline muted className="w-full rounded-2xl bg-black" />
          : <button onClick={() => { setRes(null); setScan(true); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] text-lg font-bold text-white"><ScanLine />{t('control.scan')}</button>}
        <div className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t('control.paste')} dir="ltr" className="min-h-12 grow rounded-xl border border-[var(--line)] bg-[var(--card)] px-3" />
          <button onClick={() => manual && check(manual)} className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 font-semibold">{t('control.check')}</button></div>
        {res && (
          <div className="rounded-2xl p-5 text-center" style={{ background: res.valid ? 'var(--ok-s)' : 'var(--bad-s)', color: res.valid ? 'var(--ok)' : 'var(--bad)' }}>
            {res.valid ? <ShieldCheck size={48} className="mx-auto" /> : <ShieldX size={48} className="mx-auto" />}
            <b className="mt-2 block font-display text-2xl">{t(res.valid ? 'control.valid' : 'control.invalid')}</b>
            <span className="text-sm">{res.valid ? `${t(`p.${res.product}`)}${res.tripsLeft != null ? ` · ${t('tickets.left', { n: res.tripsLeft })}` : ''}` : t(`r.${res.reason}`)}</span>
          </div>)}
      </div>
    </div>
  );
}

/* ---------- Account / Report ---------- */
export function AccountScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { lang, alerts, set } = usePax();
  return (
    <div className="pb-6">
      <Header title={t('account.title')} />
      <div className="px-4">
        <Card className="flex gap-2 p-2">{(['fr', 'ar'] as const).map((l) => (
          <button key={l} aria-pressed={lang === l} onClick={() => set({ lang: l })}
            className={`min-h-12 grow rounded-xl font-bold ${lang === l ? 'bg-[var(--color-accent)] text-white' : ''}`}>{l === 'fr' ? 'Français' : 'العربية'}</button>))}</Card>
        <Sec>{t('account.alerts')}</Sec>
        <Card>{LINE_KEYS.map((k) => (
          <label key={k} className="flex min-h-14 items-center gap-3 border-t border-[var(--line)] px-3 first:border-0">
            <LineBadge k={k} /><span className="grow font-semibold">{LINES[k].name}</span>
            <input type="checkbox" checked={!!alerts[k]} onChange={() => set({ alerts: { ...alerts, [k]: !alerts[k] } })} className="size-5 accent-[var(--color-accent)]" /></label>))}</Card>
        <div className="mt-4 space-y-2">
          <button onClick={() => nav(`${BASE}/signaler`)} className="card flex min-h-14 w-full items-center px-4 text-start font-semibold">{t('account.report')}<span className="grow" /><Chev /></button>
          <button onClick={() => nav(`${BASE}/controle`)} className="card flex min-h-14 w-full items-center px-4 text-start font-semibold">{t('account.control')}<span className="grow" /><Chev /></button>
        </div>
      </div>
    </div>
  );
}

export function ReportScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const pid = usePax((s) => s.passengerId);
  const [cat, setCat] = useState('info');
  const [text, setText] = useState('');
  const send = async () => {
    await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passengerId: pid, category: cat, text }) }).catch(() => undefined);
    toast.success(t('report.thanks'));
    nav(-1);
  };
  return (
    <div className="pb-6">
      <Header title={t('report.title')} />
      <div className="px-4">
        <p className="mb-2 font-semibold">{t('report.cat')}</p>
        <div className="flex flex-wrap gap-2">{['clean', 'safety', 'aircon', 'info', 'other'].map((c) => (
          <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}
            className={`min-h-11 rounded-full border px-4 font-semibold ${cat === c ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--line)] bg-[var(--card)]'}`}>{t(`report.${c}`)}</button>))}</div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('report.text')} maxLength={500} rows={4}
          className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] p-3" />
        <button onClick={send} className="mt-4 min-h-14 w-full rounded-2xl bg-[var(--color-accent)] text-lg font-bold text-white">{t('report.send')}</button>
      </div>
    </div>
  );
}


