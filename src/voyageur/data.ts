import { LINES, STATIONS, TRAIN_LINE, type LineKey } from '../../shared/network.ts';
import { TRAINS } from '../../shared/domain.ts';
import { nextDeparture, type Delays } from '../../shared/routing.ts';

export interface Departure { k: LineKey; dest: string; platform: number; times: number[]; delay: number; train?: string }
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

/** Next departures at a station. Main-line Alger–Oran uses the real driver timetable, the rest is theoretical. */
export function departures(station: string, now: number, delays: Delays, limit = 2): Departure[] {
  const out: Departure[] = [];
  for (const k of STATIONS[station] ?? []) {
    const L = LINES[k], i = L.stations.indexOf(station);
    if (k === 'GO') {
      for (const t of TRAINS) {
        const idx = t.stops.findIndex((s) => s[0] === station);
        if (idx < 0 || idx === t.stops.length - 1) continue;
        const tm = toMin(t.stops[idx][1]);
        out.push({ k, dest: t.stops[t.stops.length - 1][0], platform: t.n === '1042' ? 1 : 2, times: [tm, tm + 24 * 60].filter((x) => x >= now - 1).slice(0, limit), delay: delays[TRAIN_LINE[t.n]] ?? 0, train: t.n });
      }
      continue;
    }
    for (const [dest, ok, platform] of [[L.stations[L.stations.length - 1], i < L.stations.length - 1, 1], [L.stations[0], i > 0, 2]] as const) {
      if (!ok) continue;
      const first = nextDeparture(k, station, now + 1);
      out.push({ k, dest, platform, times: Array.from({ length: limit }, (_, j) => first + j * L.freq), delay: delays[k] ?? 0 });
    }
  }
  return out.sort((a, b) => a.times[0] - b.times[0]);
}
