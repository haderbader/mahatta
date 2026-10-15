import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from './db.ts';
import { createHmac, randomUUID } from 'node:crypto';
import { CAUSES, TRAINS, RAMES, parseCab, paxMessage } from '../shared/domain.ts';
import { TRAIN_LINE, type LineKey, type LineStatus } from '../shared/network.ts';
import { PRODUCTS } from '../shared/tickets.ts';

const app = Fastify({ logger: { level: 'info' } });
const io = new Server(app.server, { cors: { origin: true } });
const DRIVER = 'CDT-0458';

const one = <T>(sql: string, ...p: (string | number)[]) => db.prepare(sql).get(...p) as T | undefined;
const all = <T>(sql: string, ...p: (string | number)[]) => db.prepare(sql).all(...p) as T[];

io.on('connection', (s) => {
  const { service, centre, pax } = s.handshake.query;
  if (centre) s.join('centre');
  if (pax) s.join('pax');
  if (service) s.join(`service:${service}`);
});

const serviceView = (id: number) => {
  const s = one<{ id: number; train: string }>('SELECT * FROM services WHERE id=?', id);
  if (!s) return null;
  const events = all<{ kind: string; data: string; at: number; client_id: string }>(
    'SELECT kind,data,at,client_id FROM events WHERE service_id=? ORDER BY at, id', id,
  ).map((e) => ({ ...e, data: JSON.parse(e.data) }));
  const messages = all('SELECT * FROM messages WHERE train=? ORDER BY id', s.train);
  return { service: s, events, messages };
};

/** Line status is derived from the drivers' live declarations: nothing is hand-entered. */
function networkStatus() {
  const status: Partial<Record<LineKey, LineStatus>> = {};
  const delays: Partial<Record<LineKey, number>> = {};
  const trains: { n: string; line: LineKey; from: string; to: string; progress: number; stopped: boolean }[] = [];
  for (const s of all<{ id: number; train: string }>('SELECT id,train FROM services WHERE ended_at IS NULL')) {
    const line = TRAIN_LINE[s.train];
    if (!line) continue;
    // The cab app keeps the "next stop" fixed (index 2) in this demo; the train sits 60% of the way to it.
    const def = TRAINS.find((x) => x.n === s.train);
    if (def) trains.push({ n: s.train, line, from: def.stops[1][0], to: def.stops[2][0], progress: 0.6, stopped: false });
    type Inc = { cause: string; est: number; at: number };
    let cur = null as Inc | null;
    for (const e of all<{ kind: string; data: string; at: number }>(
      "SELECT kind,data,at FROM events WHERE service_id=? AND kind IN ('declare','modify','extend','resume') ORDER BY at,id", s.id)) {
      const d = JSON.parse(e.data);
      if (e.kind === 'resume') cur = null;
      else if (e.kind === 'extend' && cur) cur.est += Number(d.minutes ?? 0);
      else if (e.kind === 'declare' || e.kind === 'modify') cur = { cause: d.cause, est: Number(d.est ?? 0), at: (cur as Inc | null)?.at ?? e.at };
    }
    if (!cur) continue;
    const c = CAUSES.find((x) => x.k === cur!.cause);
    if (!c) continue;
    const bad = c.k === 'acc' || cur.est >= 30;
    if (status[line]?.status === 'bad' && !bad) continue;
    status[line] = {
      status: bad ? 'bad' : 'warn', train: s.train, since: cur.at,
      title: { fr: `Train ${s.train} : trafic perturbé`, ar: `القطار ${s.train}: اضطراب في الحركة` },
      detail: paxMessage(c, cur.est),
    };
    delays[line] = Math.max(delays[line] ?? 0, cur.est);
    const tr = trains.find((x) => x.n === s.train);
    if (tr) tr.stopped = true;
  }
  return { status, delays, trains };
}
const broadcastNetwork = () => io.to('pax').emit('network', networkStatus());
app.get('/api/network', async () => networkStatus());

// ---- Tickets (demo: payment is simulated, validation is real and signed) ----
const SECRET = process.env.TICKET_SECRET ?? 'mahatta-demo-secret';
const WINDOW = 30_000;
const sign = (id: string, w: number) => createHmac('sha256', SECRET).update(`${id}.${w}`).digest('hex').slice(0, 16);
const ticketRow = (r: Record<string, unknown>) => ({
  id: r.id, product: r.product, validFrom: r.valid_from, validTo: r.valid_to, tripsLeft: r.trips_left, price: r.price,
});

app.post('/api/tickets', async (req, reply) => {
  const b = z.object({ passengerId: z.string().min(8), product: z.string() }).parse(req.body);
  const p = PRODUCTS.find((x) => x.id === b.product);
  if (!p) return reply.code(422).send({ error: 'product_unknown' });
  const id = randomUUID();
  const from = Date.now();
  db.prepare('INSERT INTO tickets (id,passenger_id,product,valid_from,valid_to,trips_left,price,created_at) VALUES (?,?,?,?,?,?,?,?)').run(
    id, b.passengerId, p.id, from, p.validDays ? from + p.validDays * 86_400_000 : null, p.trips ?? null, p.price, from);
  return ticketRow(one('SELECT * FROM tickets WHERE id=?', id)!);
});
app.get('/api/tickets', async (req) => {
  const { passengerId } = z.object({ passengerId: z.string() }).parse(req.query);
  return all('SELECT * FROM tickets WHERE passenger_id=? ORDER BY created_at DESC', passengerId).map((r) => ticketRow(r as Record<string, unknown>));
});
app.get('/api/tickets/:id/token', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { passengerId } = z.object({ passengerId: z.string() }).parse(req.query);
  const t = one('SELECT id FROM tickets WHERE id=? AND passenger_id=?', id, passengerId);
  if (!t) return reply.code(404).send({ error: 'not_found' });
  const w = Math.floor(Date.now() / WINDOW);
  return { token: `${id}.${w}.${sign(id, w)}`, expiresAt: (w + 1) * WINDOW };
});
app.post('/api/tickets/validate', async (req) => {
  const { token } = z.object({ token: z.string() }).parse(req.body);
  const [id, ws, sig] = token.split('.');
  const w = Number(ws);
  const cur = Math.floor(Date.now() / WINDOW);
  if (!id || !sig || !Number.isInteger(w) || sign(id, w) !== sig) return { valid: false, reason: 'signature' };
  if (cur - w > 1 || w > cur) return { valid: false, reason: 'expired_code' };
  const t = one<{ product: string; valid_to: number | null; trips_left: number | null; last_window: number | null }>('SELECT * FROM tickets WHERE id=?', id);
  if (!t) return { valid: false, reason: 'unknown' };
  if (t.valid_to && Date.now() > t.valid_to) return { valid: false, reason: 'expired' };
  if (t.trips_left !== null && t.trips_left <= 0) return { valid: false, reason: 'no_trips' };
  if (t.last_window === w) return { valid: true, product: t.product, tripsLeft: t.trips_left, repeat: true };
  let left = t.trips_left;
  if (left !== null) left -= 1;
  db.prepare('UPDATE tickets SET last_window=?, trips_left=? WHERE id=?').run(w, left, id);
  return { valid: true, product: t.product, tripsLeft: left };
});

app.post('/api/reports', async (req) => {
  const b = z.object({ passengerId: z.string().optional(), category: z.string(), train: z.string().optional(), text: z.string().max(500).optional() }).parse(req.body);
  const r = db.prepare('INSERT INTO reports (passenger_id,category,train,text,created_at) VALUES (?,?,?,?,?)').run(
    b.passengerId ?? null, b.category, b.train ?? null, b.text ?? null, Date.now());
  io.to('centre').emit('report', { id: Number(r.lastInsertRowid), category: b.category, train: b.train, text: b.text, at: Date.now() });
  return { ok: true };
});

app.get('/api/trains', async () => ({ trains: TRAINS, rames: RAMES }));

app.post('/api/services', async (req, reply) => {
  const body = z.object({ cabPayload: z.string(), train: z.string() }).parse(req.body);
  const cab = parseCab(body.cabPayload);
  if (!cab) return reply.code(422).send({ error: 'cab_unknown' });
  if (!TRAINS.some((t) => t.n === body.train)) return reply.code(422).send({ error: 'train_unknown' });
  const r = db
    .prepare('INSERT INTO services (driver,rame,cab,train,started_at) VALUES (?,?,?,?,?)')
    .run(DRIVER, cab.rame, cab.cab, body.train, Date.now());
  const id = Number(r.lastInsertRowid);
  io.to('centre').emit('service', { id, ...cab, train: body.train });
  return serviceView(id);
});

app.get('/api/services/:id', async (req, reply) => {
  const v = serviceView(Number((req.params as { id: string }).id));
  return v ?? reply.code(404).send({ error: 'not_found' });
});

const eventSchema = z.object({
  clientId: z.string().min(8),
  kind: z.enum(['declare', 'extend', 'modify', 'resume', 'ack', 'swap']),
  at: z.number(),
  data: z.record(z.string(), z.unknown()).default({}),
});

// Idempotent on clientId: the cab may replay its offline queue several times.
app.post('/api/services/:id/events', async (req, reply) => {
  const id = Number((req.params as { id: string }).id);
  const s = one<{ train: string; ended_at: number | null }>('SELECT * FROM services WHERE id=?', id);
  if (!s) return reply.code(404).send({ error: 'not_found' });
  const ev = eventSchema.parse(req.body);
  const dup = one('SELECT id FROM events WHERE client_id=?', ev.clientId);
  if (dup) return { ok: true, duplicate: true };
  const received = Date.now();
  db.prepare('INSERT INTO events (service_id,client_id,kind,data,at,received_at) VALUES (?,?,?,?,?,?)').run(
    id, ev.clientId, ev.kind, JSON.stringify(ev.data), ev.at, received,
  );
  if (ev.kind === 'ack' && typeof ev.data.messageId === 'number') {
    db.prepare('UPDATE messages SET acked_at=? WHERE id=? AND acked_at IS NULL').run(ev.at, ev.data.messageId);
  }
  if (ev.kind === 'swap' && typeof ev.data.to === 'string' && RAMES.includes(ev.data.to)) {
    db.prepare('UPDATE services SET rame=? WHERE id=?').run(ev.data.to, id);
  }
  let pax: unknown;
  if (ev.kind === 'declare' || ev.kind === 'modify') {
    const c = CAUSES.find((x) => x.k === ev.data.cause);
    if (c) pax = paxMessage(c, Number(ev.data.est ?? 0)); // what travellers will see
  }
  broadcastNetwork();
  io.to('centre').emit('event', { serviceId: id, train: s.train, kind: ev.kind, at: ev.at, data: ev.data, pax, receivedAt: received });
  return { ok: true, receivedAt: received };
});

app.post('/api/services/:id/end', async (req) => {
  const id = Number((req.params as { id: string }).id);
  db.prepare('UPDATE services SET ended_at=? WHERE id=? AND ended_at IS NULL').run(Date.now(), id);
  io.to('centre').emit('service-end', { id });
  broadcastNetwork();
  return { ok: true };
});

// Control room → driver
app.post('/api/messages', async (req) => {
  const b = z.object({ train: z.string(), fr: z.string().min(1), ar: z.string().min(1) }).parse(req.body);
  const r = db.prepare('INSERT INTO messages (train,fr,ar,created_at) VALUES (?,?,?,?)').run(b.train, b.fr, b.ar, Date.now());
  const msg = one('SELECT * FROM messages WHERE id=?', Number(r.lastInsertRowid));
  for (const s of all<{ id: number }>('SELECT id FROM services WHERE train=? AND ended_at IS NULL', b.train)) {
    io.to(`service:${s.id}`).emit('message', msg);
  }
  io.to('centre').emit('message', msg);
  return msg;
});

app.get('/api/centre', async () => ({
  services: all('SELECT * FROM services WHERE ended_at IS NULL ORDER BY id DESC'),
  events: all<{ data: string }>(
    'SELECT e.*, s.train FROM events e JOIN services s ON s.id=e.service_id ORDER BY e.id DESC LIMIT 50',
  ).map((e) => ({ ...e, data: JSON.parse(e.data) })),
  messages: all('SELECT * FROM messages ORDER BY id DESC LIMIT 20'),
  reports: all('SELECT * FROM reports ORDER BY id DESC LIMIT 20'),
}));

const dist = resolve('dist');
if (existsSync(dist)) {
  await app.register(fastifyStatic, { root: dist });
  app.setNotFoundHandler((req, reply) => reply.sendFile(req.url.startsWith('/voyageur') ? 'voyageur.html' : 'index.html'));
}

await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
