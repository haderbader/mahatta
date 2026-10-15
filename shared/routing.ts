import { LINES, STATIONS, type LineKey } from './network.ts';

const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

export interface Leg { k: LineKey; a: string; b: string; dep: number; arr: number; stops: number; delay: number; dir: string; between: string[] }
export interface Route { legs: Leg[]; via?: string; dep: number; arr: number; dur: number; delay: number }
/** Extra delay (min) per line, fed by live driver declarations. */
export type Delays = Partial<Record<LineKey, number>>;

/** Theoretical next departure on a line from a station, in minutes since midnight. */
export const nextDeparture = (k: LineKey, station: string, from: number) => {
  const f = LINES[k].freq, off = hash(station + k) % f;
  return Math.ceil((from - off) / f) * f + off;
};

export function computeRoutes(from: string, to: string, nowMin: number, delays: Delays = {}, blocked: LineKey[] = []): Route[] {
  if (!STATIONS[from] || !STATIONS[to] || from === to) return [];
  const leg = (k: LineKey, a: string, b: string, dep: number): Leg => {
    const st = LINES[k].stations, ia = st.indexOf(a), ib = st.indexOf(b);
    const stops = Math.abs(ib - ia), per = LINES[k].kind === 'sub' ? 3 : 22, delay = delays[k] ?? 0;
    const between = ib > ia ? st.slice(ia + 1, ib) : st.slice(ib + 1, ia).reverse();
    return { k, a, b, dep, arr: dep + stops * per + delay, stops, delay, dir: ib > ia ? st[st.length - 1] : st[0], between };
  };
  const ok = (k: LineKey) => !blocked.includes(k);
  const res: Route[] = [];
  for (const k of STATIONS[from]) {
    if (!LINES[k].stations.includes(to) || !ok(k)) continue;
    for (let j = 0; j < 3; j++) res.push(mk([leg(k, from, to, nextDeparture(k, from, nowMin + 2) + j * LINES[k].freq)]));
  }
  if (res.length < 2) {
    for (const k1 of STATIONS[from]) for (const x of LINES[k1].stations) {
      if (x === from || x === to || !ok(k1)) continue;
      for (const k2 of STATIONS[x]) {
        if (k2 === k1 || !LINES[k2].stations.includes(to) || !ok(k2)) continue;
        for (let j = 0; j < 2; j++) {
          const l1 = leg(k1, from, x, nextDeparture(k1, from, nowMin + 2) + j * LINES[k1].freq);
          const l2 = leg(k2, x, to, nextDeparture(k2, x, l1.arr + 5));
          res.push({ ...mk([l1, l2]), via: x });
        }
      }
    }
  }
  const seen = new Set<string>();
  return res.sort((a, b) => a.arr - b.arr).filter((r) => {
    const key = `${r.dep}-${r.arr}-${r.legs.map((l) => l.k)}`;
    return seen.has(key) ? false : (seen.add(key), true);
  }).slice(0, 4);
}
function mk(legs: Leg[]): Route {
  const dep = legs[0].dep, arr = legs[legs.length - 1].arr;
  return { legs, dep, arr, dur: arr - dep, delay: legs.reduce((s, l) => s + l.delay, 0) };
}
