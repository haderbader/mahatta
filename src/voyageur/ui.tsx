import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Route, TrafficCone, Ticket, User, ChevronLeft, ChevronRight, Check, AlertTriangle, XCircle } from 'lucide-react';
import { LINES, type LineKey, type Status } from '../../shared/network.ts';

export const BASE = '/voyageur';

export function LineBadge({ k, size = 28, status }: { k: LineKey; size?: number; status?: Status }) {
  const l = LINES[k];
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-lg font-display font-bold text-white"
      style={{ background: l.color, width: size + (l.code.length > 1 ? 8 : 0), height: size, fontSize: size * 0.58 }}
      aria-label={`${l.code} ${l.name}`}>
      {l.code}
      {status && status !== 'ok' && (
        <span className="absolute -end-1.5 -top-1.5 grid size-4 place-items-center rounded-full text-[10px] font-bold text-white"
          style={{ background: status === 'warn' ? '#c7700f' : '#b3261e' }}>{status === 'warn' ? '!' : '×'}</span>)}
    </span>
  );
}

const STYLE: Record<Status, { bg: string; fg: string; Ic: typeof Check }> = {
  ok: { bg: 'var(--ok-s)', fg: 'var(--ok)', Ic: Check },
  warn: { bg: 'var(--warn-s)', fg: 'var(--warn)', Ic: AlertTriangle },
  bad: { bg: 'var(--bad-s)', fg: 'var(--bad)', Ic: XCircle },
};
export function StatusPill({ s, short }: { s: Status; short?: boolean }) {
  const { t } = useTranslation();
  const { bg, fg, Ic } = STYLE[s];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: bg, color: fg }}>
      <Ic size={13} strokeWidth={3} />{t(short ? `st.${s}Short` : `st.${s}`)}
    </span>
  );
}

export function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  const nav = useNavigate();
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-[var(--bg)]/90 px-4 py-3 backdrop-blur">
      <button onClick={() => nav(-1)} aria-label={t('back')} className="grid size-10 place-items-center rounded-full bg-[var(--card)] border border-[var(--line)]">
        <ChevronLeft className="flip" size={22} />
      </button>
      <h1 className="m-0 grow font-display text-2xl font-semibold">{title}</h1>
      {right}
    </header>
  );
}

export const Chev = () => <ChevronRight className="flip shrink-0 text-[var(--muted)]" size={18} />;

export function TabBar() {
  const { t } = useTranslation();
  const tabs = [
    { to: BASE, end: true, Ic: Home, l: 'tab.home' }, { to: `${BASE}/itineraire`, Ic: Route, l: 'tab.itin' },
    { to: `${BASE}/trafic`, Ic: TrafficCone, l: 'tab.traffic' }, { to: `${BASE}/billets`, Ic: Ticket, l: 'tab.tickets' },
    { to: `${BASE}/compte`, Ic: User, l: 'tab.account' },
  ];
  return (
    <nav className="grid grid-cols-5 border-t border-[var(--line)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ to, end, Ic, l }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--muted)]'}`}>
          <Ic size={22} />{t(l)}
        </NavLink>))}
    </nav>
  );
}
