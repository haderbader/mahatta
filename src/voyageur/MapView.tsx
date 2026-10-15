import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(workerUrl);
import { COORDS, LINES, LINE_KEYS, type LineKey } from '../../shared/network.ts';
import type { LiveTrain } from './hooks.ts';

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap' },
    orm: { type: 'raster', tiles: ['https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenRailwayMap' },
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.6, 'raster-opacity': 0.9 } },
    { id: 'orm', type: 'raster', source: 'orm', paint: { 'raster-opacity': 0.55 } },
  ],
};

const lineFeature = (k: LineKey) => ({
  type: 'Feature' as const, properties: { k, color: LINES[k].color, main: LINES[k].kind === 'main' ? 1 : 0 },
  geometry: { type: 'LineString' as const, coordinates: LINES[k].stations.map((s) => COORDS[s]) },
});

export function trainPoint(t: LiveTrain): [number, number] {
  const a = COORDS[t.from], b = COORDS[t.to];
  return [a[0] + (b[0] - a[0]) * t.progress, a[1] + (b[1] - a[1]) * t.progress];
}

export function MapView({ focus, trains = [], onStation, className }: {
  focus?: string[]; trains?: LiveTrain[]; onStation?: (s: string) => void; className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const cb = useRef(onStation);
  cb.current = onStation;

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({ container: el.current, style: STYLE, center: [3.1, 36.7], zoom: 9, attributionControl: { compact: true } });
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);
    m.on('load', () => {
      m.addSource('lines', { type: 'geojson', data: { type: 'FeatureCollection', features: LINE_KEYS.map(lineFeature) } });
      m.addLayer({ id: 'lines-casing', type: 'line', source: 'lines', paint: { 'line-color': '#fff', 'line-width': 7 } });
      m.addLayer({ id: 'lines', type: 'line', source: 'lines', paint: { 'line-color': ['get', 'color'], 'line-width': 4 } });
      const pts = Object.entries(COORDS).map(([name, c]) => ({ type: 'Feature' as const, properties: { name }, geometry: { type: 'Point' as const, coordinates: c } }));
      m.addSource('stations', { type: 'geojson', data: { type: 'FeatureCollection', features: pts } });
      m.addLayer({ id: 'stations', type: 'circle', source: 'stations', paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-width': 2.5, 'circle-stroke-color': '#003366' } });
      m.addLayer({ id: 'station-names', type: 'symbol', source: 'stations', minzoom: 9.5,
        layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-font': ['Noto Sans Regular'] },
        paint: { 'text-color': '#0b1d3a', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
      m.on('click', 'stations', (e) => { const n = e.features?.[0]?.properties?.name as string | undefined; if (n) cb.current?.(n); });
      m.on('mouseenter', 'stations', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'stations', () => { m.getCanvas().style.cursor = ''; });
    });
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !focus?.length) return;
    const pts = focus.map((s) => COORDS[s]).filter(Boolean);
    if (pts.length === 1) { m.easeTo({ center: pts[0], zoom: 11 }); return; }
    const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
    pts.forEach((p) => b.extend(p));
    m.fitBounds(b, { padding: 60, maxZoom: 12, duration: 600 });
  }, [focus?.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = trains.map((t) => {
      const d = document.createElement('div');
      d.className = 'grid size-8 place-items-center rounded-full text-xs font-bold text-white shadow-lg ring-2 ring-white';
      d.style.background = t.stopped ? '#b3261e' : '#003366';
      d.textContent = '🚆';
      d.title = t.n;
      return new maplibregl.Marker({ element: d }).setLngLat(trainPoint(t)).addTo(m);
    });
  }, [trains]);

  // MapLibre sets position:relative on its container, so it sits inside an outer box that owns the size/position.
  return <div className={`${className ?? ''} ${className?.includes('absolute') ? '' : 'relative'}`}><div ref={el} style={{ position: 'absolute', inset: 0 }} /></div>;
}
