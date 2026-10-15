import { useEffect, useMemo, useState } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from '@tanstack/react-table';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, ChevronDown, Clock, MessageSquare, Moon, Sun, Timer, Train as TrainIcon, Megaphone, X } from 'lucide-react';
import { CAUSES, TRAINS } from '../../shared/domain.ts';
import { tx, TEMPLATES, type K, type L } from './strings.ts';
import { sendMessage, useCentre, type Svc } from './data.ts';

const hm = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const mins = (ms: number) => Math.max(0, Math.round(ms / 60000));
const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const causeOf = (k?: string) => CAUSES.find((c) => c.k === k);
const useNow = () => { const [n, s] = useState(Date.now()); useEffect(() => { const i = setInterval(() => s(Date.now()), 5000); return () => clearInterval(i); }, []); return n; };

function Kpi({ Ic, label, value, unit, alert }: { Ic: typeof Activity; label: string; value: string | number; unit?: string; alert?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Ic size={22} className={alert ? 'text-amber-300' : 'text-sky-300'} />
      <div className="leading-tight"><span className="block text-xs text-slate-300">{label}</span>
        <b className={`num font-display text-3xl font-semibold ${alert ? 'text-amber-300' : 'text-white'}`}>{value}{unit && <small className="ms-1 text-sm font-medium text-slate-300">{unit}</small>}</b></div>
    </div>
  );
}

function MessageDialog({ l, trains, initial, open, onOpenChange }: { l: L; trains: string[]; initial?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [train, setTrain] = useState(initial ?? trains[0] ?? '1042');
  const [fr, setFr] = useState('');
  const [ar, setAr] = useState('');
  useEffect(() => { if (initial) setTrain(initial); }, [initial]);
  const all = Array.from(new Set([...trains, ...TRAINS.map((t) => t.n)]));
  const submit = async () => { if (!fr || !ar) return; await sendMessage(train, fr, ar); setFr(''); setAr(''); onOpenChange(false); };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="card fixed start-1/2 top-1/2 z-50 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 p-5 shadow-2xl rtl:translate-x-1/2">
          <div className="flex items-center justify-between"><Dialog.Title className="m-0 font-display text-2xl font-semibold">{tx(l, 'sendMsg')}</Dialog.Title>
            <Dialog.Close aria-label={tx(l, 'cancel')}><X /></Dialog.Close></div>
          <Dialog.Description className="sr-only">{tx(l, 'sendMsg')}</Dialog.Description>
          <Select.Root value={train} onValueChange={setTrain}>
            <Select.Trigger className="mt-3 flex min-h-11 w-full items-center justify-between rounded-lg border border-[var(--line)] px-3 font-semibold" aria-label={tx(l, 'c_train')}>
              <Select.Value /><ChevronDown size={16} /></Select.Trigger>
            <Select.Portal><Select.Content className="card z-[60] p-1 shadow-xl" position="popper"><Select.Viewport>
              {all.map((n) => <Select.Item key={n} value={n} className="cursor-pointer rounded-md px-3 py-2 font-semibold outline-none data-[highlighted]:bg-[var(--acc-s)]"><Select.ItemText>{n}</Select.ItemText></Select.Item>)}
            </Select.Viewport></Select.Content></Select.Portal>
          </Select.Root>
          <p className="mt-3 mb-1 text-xs font-bold uppercase text-[var(--muted)]">{tx(l, 'templates')}</p>
          <div className="flex flex-wrap gap-2">{TEMPLATES.map((k: K) => (
            <button key={k} onClick={() => { setFr(tx('fr', k)); setAr(tx('ar', k)); }} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--acc-s)]">{tx(l, k)}</button>))}</div>
          <input value={fr} onChange={(e) => setFr(e.target.value)} placeholder={tx(l, 'msgFr')} className="mt-3 min-h-11 w-full rounded-lg border border-[var(--line)] bg-transparent px-3" />
          <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder={tx(l, 'msgAr')} dir="rtl" className="mt-2 min-h-11 w-full rounded-lg border border-[var(--line)] bg-transparent px-3" />
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close className="min-h-11 rounded-lg border border-[var(--line)] px-4 font-semibold">{tx(l, 'cancel')}</Dialog.Close>
            <button onClick={submit} disabled={!fr || !ar} className="min-h-11 rounded-lg bg-[var(--accent)] px-5 font-bold text-white disabled:opacity-50">{tx(l, 'send')}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const col = createColumnHelper<Svc>();

function TrainsTable({ l, rows, now, onMessage }: { l: L; rows: Svc[]; now: number; onMessage: (train: string) => void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => [
    col.accessor('train', { header: () => tx(l, 'c_train'), cell: (c) => <b className="font-display text-xl">{c.getValue()}</b> }),
    col.accessor('rame', { header: () => tx(l, 'c_rame') }),
    col.accessor((r) => (r.incident ? 1 : 0), { id: 'state', header: () => tx(l, 'c_state'),
      cell: (c) => c.getValue() ? <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--warn-s)', color: 'var(--warn)' }}>■ {tx(l, 'stopped')}</span>
        : <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--ok-s)', color: 'var(--ok)' }}>▶ {tx(l, 'running')}</span> }),
    col.accessor((r) => causeOf(r.incident?.cause)?.n[l] ?? '—', { id: 'cause', header: () => tx(l, 'c_cause') }),
    col.accessor((r) => r.incident?.at ?? 0, { id: 'since', header: () => tx(l, 'c_since'),
      cell: (c) => c.getValue() ? <span className="num">{hm(c.getValue())} · {mins(now - c.getValue())} {tx(l, 'min')}</span> : '—' }),
    col.accessor((r) => r.incident?.est ?? 0, { id: 'delay', header: () => tx(l, 'c_delay'),
      cell: (c) => <span className="num font-semibold" style={{ color: c.getValue() ? 'var(--warn)' : 'var(--ok)' }}>{c.getValue() ? `+${c.getValue()} ${tx(l, 'min')}` : tx(l, 'onTime')}</span> }),
    col.accessor('pending', { header: () => tx(l, 'c_msg'), cell: (c) => c.getValue() ? <span className="font-bold text-[var(--warn)]">{c.getValue()} {tx(l, 'unread')}</span> : <span className="text-[var(--ok)]">✓</span> }),
    col.display({ id: 'act', header: () => tx(l, 'c_act'), cell: (c) => (
      <button onClick={() => onMessage(c.row.original.train)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-white"><MessageSquare size={15} />{tx(l, 'message')}</button>) }),
  ], [l, now, onMessage]);
  const t = useReactTable({ data: rows, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  if (!rows.length) return <p className="m-0 p-6 text-center text-[var(--muted)]">{tx(l, 'none')}</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>{t.getHeaderGroups().map((g) => <tr key={g.id}>{g.headers.map((h) => (
        <th key={h.id} onClick={h.column.getToggleSortingHandler()} className="cursor-pointer border-b border-[var(--line)] px-3 py-2 text-start text-xs font-bold uppercase text-[var(--muted)]">
          {flexRender(h.column.columnDef.header, h.getContext())}{{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}</th>))}</tr>)}</thead>
      <tbody>{t.getRowModel().rows.map((r) => <tr key={r.id} className="border-b border-[var(--line)] last:border-0">{r.getVisibleCells().map((c) => <td key={c.id} className="px-3 py-3">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>)}</tbody>
    </table>
  );
}

function Synoptic({ l, services }: { l: L; services: Svc[] }) {
  const stops = TRAINS[0].stops.map((s) => s[0]);
  const w = 720, x = (i: number) => 40 + (i * (w - 80)) / (stops.length - 1);
  return (
    <svg viewBox={`0 0 ${w} 130`} className="w-full" role="img" aria-label={tx(l, 'synoptic')}>
      <line x1={x(0)} x2={x(stops.length - 1)} y1={70} y2={70} stroke="var(--line)" strokeWidth={6} strokeLinecap="round" />
      {stops.map((s, i) => (<g key={s}><circle cx={x(i)} cy={70} r={7} fill="var(--card)" stroke="var(--accent)" strokeWidth={3} />
        <text x={x(i)} y={100} textAnchor="middle" fontSize={11} fill="var(--muted)">{s}</text></g>))}
      {services.map((s) => {
        const pos = x(1.6); // the cab demo keeps the next stop fixed at index 2
        const stopped = !!s.incident;
        return (<g key={s.id}><circle cx={pos} cy={70} r={13} fill={stopped ? 'var(--bad)' : 'var(--accent)'} stroke="#fff" strokeWidth={3} />
          <text x={pos} y={42} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">{s.train}{stopped ? ' ■' : ''}</text></g>);
      })}
    </svg>
  );
}

function TimeDistance({ l, services, now }: { l: L; services: Svc[]; now: number }) {
  const series = TRAINS.map((t, k) => ({
    n: t.n, color: k ? '#d9731a' : '#1e5aa8',
    data: t.stops.map((s, i) => ({ x: toMin(s[1]), y: k ? 7 - i : i })),
  }));
  const d = new Date(now), nowMin = d.getHours() * 60 + d.getMinutes();
  const live = services.filter((s) => TRAINS.some((t) => t.n === s.train));
  const dom: [number, number] = [toMin('08:00'), toMin('19:45')];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="var(--line)" />
        <XAxis type="number" dataKey="x" domain={dom} tickFormatter={(v) => `${String(Math.floor(v / 60)).padStart(2, '0')}h`} tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDuplicatedCategory={false} />
        <YAxis type="number" dataKey="y" domain={[0, 7]} ticks={[0, 1, 2, 3, 4, 5, 6, 7]} width={110} tick={{ fill: 'var(--muted)', fontSize: 11 }}
          tickFormatter={(v) => TRAINS[0].stops[v]?.[0] ?? ''} reversed />
        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} formatter={(v) => TRAINS[0].stops[Number(v)]?.[0] ?? String(v)} labelFormatter={(v) => `${Math.floor(Number(v) / 60)}:${String(Number(v) % 60).padStart(2, '0')}`} />
        {series.map((s) => <Line key={s.n} data={s.data} dataKey="y" name={s.n} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />)}
        {nowMin >= dom[0] && nowMin <= dom[1] && <ReferenceLine x={nowMin} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: tx(l, 'now'), fill: 'var(--muted)', fontSize: 11 }} />}
        {live.map((s) => {
          const t = TRAINS.find((x) => x.n === s.train)!;
          const a = toMin(t.stops[1][1]), b = toMin(t.stops[2][1]);
          return <ReferenceDot key={s.id} x={a + (b - a) * 0.6 + (s.incident?.est ?? 0)} y={1.6} r={7} fill={s.incident ? '#c0392b' : '#1e8a50'} stroke="#fff" />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function App() {
  const { state, events, msgs, reports, live } = useCentre();
  const [l, setL] = useState<L>(() => (localStorage.getItem('centre-lang') as L) || 'fr');
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [dlg, setDlg] = useState<{ open: boolean; train?: string }>({ open: false });
  const now = useNow();
  useEffect(() => {
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('centre-lang', l);
  }, [l, dark]);

  const svc = state.services;
  const active = svc.filter((s) => s.incident);
  const delay = active.reduce((a, s) => a + (s.incident?.est ?? 0), 0);
  const causes = Object.entries(state.stats.byCause).map(([k, v]) => ({ name: causeOf(k)?.n[l] ?? k, v }));
  const evLabel = (k: string) => tx(l, `e_${k}` as K);
  const evText = (e: (typeof events)[number]) => {
    const c = causeOf(e.data.cause as string);
    if (e.kind === 'extend') return `+${e.data.minutes} ${tx(l, 'min')}`;
    if (e.kind === 'swap') return `${e.data.from} → ${e.data.to}`;
    return `${c?.n[l] ?? ''}${e.data.est ? ` · ${e.data.est} ${tx(l, 'min')}` : ''}`;
  };

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-[var(--bar)] px-4 py-2 text-white">
        <img src="/logo.png" alt="SNTF" width={52} height={27} className="rounded bg-white/90 p-1" />
        <h1 className="m-0 me-4 font-display text-2xl font-semibold">{tx(l, 'title')}</h1>
        <Kpi Ic={TrainIcon} label={tx(l, 'k_running')} value={svc.length - active.length} />
        <Kpi Ic={AlertTriangle} label={tx(l, 'k_inc')} value={active.length} alert={active.length > 0} />
        <Kpi Ic={Clock} label={tx(l, 'k_delay')} value={delay} unit={tx(l, 'min')} alert={delay > 0} />
        <Kpi Ic={Megaphone} label={tx(l, 'k_decl')} value={state.stats.declarations} />
        <Kpi Ic={Timer} label={tx(l, 'k_stop')} value={state.stats.avgStopMin} unit={tx(l, 'min')} />
        <Kpi Ic={MessageSquare} label={tx(l, 'k_reports')} value={reports.length} />
        <span className="grow" />
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${live ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>● {tx(l, live ? 'live' : 'offline')}</span>
        <button onClick={() => setL(l === 'fr' ? 'ar' : 'fr')} className="min-h-9 rounded-full bg-white/10 px-3 text-sm font-bold">{l === 'fr' ? 'العربية' : 'Français'}</button>
        <button onClick={() => setDark(!dark)} aria-label={tx(l, dark ? 'day' : 'night')} className="grid size-9 place-items-center rounded-full bg-white/10">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid min-w-0 gap-4">
          <section className="card overflow-x-auto"><div className="flex items-center justify-between p-4 pb-2"><h2 className="t">{tx(l, 'trains')}</h2>
            <button onClick={() => setDlg({ open: true })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-sm font-bold"><Megaphone size={15} />{tx(l, 'sendMsg')}</button></div>
            <TrainsTable l={l} rows={svc} now={now} onMessage={(t) => setDlg({ open: true, train: t })} /></section>
          <section className="card p-4"><h2 className="t mb-2">{tx(l, 'synoptic')}</h2><Synoptic l={l} services={svc} /></section>
          <section className="card p-4"><h2 className="t mb-2">{tx(l, 'tdg')}</h2><TimeDistance l={l} services={svc} now={now} /></section>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <section className="card p-4"><h2 className="t mb-2">{tx(l, 'causes')}</h2>
            {causes.length ? (
              <ResponsiveContainer width="100%" height={Math.max(120, causes.length * 38)}>
                <BarChart data={causes} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" allowDecimals={false} domain={[0, (m: number) => Math.max(2, m + 1)]} hide /><YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--ink)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} cursor={{ fill: 'var(--acc-s)' }} />
                  <Bar dataKey="v" fill="#1e5aa8" radius={[0, 6, 6, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>) : <p className="m-0 text-[var(--muted)]">{tx(l, 'noData')}</p>}
          </section>

          <Tabs.Root defaultValue="feed" className="card p-4">
            <Tabs.List className="mb-3 flex gap-1 border-b border-[var(--line)]">
              {(['feed', 'reports'] as const).map((v) => <Tabs.Trigger key={v} value={v} className="min-h-10 border-b-2 border-transparent px-3 font-bold text-[var(--muted)] data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--ink)]">{tx(l, v)}</Tabs.Trigger>)}
              <Tabs.Trigger value="msgs" className="min-h-10 border-b-2 border-transparent px-3 font-bold text-[var(--muted)] data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--ink)]">{tx(l, 'c_msg')}</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="feed" className="grid max-h-[460px] gap-2 overflow-y-auto">
              {events.length === 0 && <p className="m-0 text-[var(--muted)]">{tx(l, 'noData')}</p>}
              {events.map((e, i) => (
                <div key={e.id ?? i} className="rounded-xl border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]"><span>{e.train} · {hm(e.at)}</span>
                    <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: 'var(--acc-s)', color: 'var(--accent)' }}>{evLabel(e.kind)}</span></div>
                  <p className="m-0 mt-1 font-semibold">{evText(e)}</p>
                  {e.pax && <p className="m-0 mt-1 text-xs text-[var(--muted)]">{tx(l, 'pax')} : {e.pax[l]}</p>}
                </div>))}
            </Tabs.Content>
            <Tabs.Content value="reports" className="grid max-h-[460px] gap-2 overflow-y-auto">
              {reports.length === 0 && <p className="m-0 text-[var(--muted)]">{tx(l, 'noData')}</p>}
              {reports.map((r) => (<div key={r.id} className="rounded-xl border border-[var(--line)] p-3">
                <div className="text-xs text-[var(--muted)]">{hm(r.created_at)}</div>
                <b>{tx(l, `r_${r.category}` as K)}</b>{r.text && <p className="m-0 text-sm">{r.text}</p>}</div>))}
            </Tabs.Content>
            <Tabs.Content value="msgs" className="grid max-h-[460px] gap-2 overflow-y-auto">
              {msgs.length === 0 && <p className="m-0 text-[var(--muted)]">{tx(l, 'noData')}</p>}
              {msgs.map((m) => (<div key={m.id} className="rounded-xl border border-[var(--line)] p-3">
                <div className="flex items-center justify-between text-xs text-[var(--muted)]"><span>{m.train} · {hm(m.created_at)}</span>
                  <span className="rounded-full px-2 py-0.5 font-bold" style={m.acked_at ? { background: 'var(--ok-s)', color: 'var(--ok)' } : { background: 'var(--warn-s)', color: 'var(--warn)' }}>
                    {m.acked_at ? `${tx(l, 'acked')} ${hm(m.acked_at)}` : tx(l, 'unread')}</span></div>
                <p className="m-0 mt-1 font-semibold">{m[l]}</p></div>))}
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </main>
      <MessageDialog l={l} trains={svc.map((s) => s.train)} initial={dlg.train} open={dlg.open} onOpenChange={(o) => setDlg((d) => ({ ...d, open: o }))} />
    </div>
  );
}
