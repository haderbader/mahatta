import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from './db.ts';
import { CAUSES, TRAINS, RAMES, parseCab, paxMessage } from '../shared/domain.ts';

const app = Fastify({ logger: { level: 'info' } });
const io = new Server(app.server, { cors: { origin: true } });
const DRIVER = 'CDT-0458';

const one = <T>(sql: string, ...p: (string | number)[]) => db.prepare(sql).get(...p) as T | undefined;
const all = <T>(sql: string, ...p: (string | number)[]) => db.prepare(sql).all(...p) as T[];

io.on('connection', (s) => {
  const { service, centre } = s.handshake.query;
  if (centre) s.join('centre');
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
  io.to('centre').emit('event', { serviceId: id, train: s.train, kind: ev.kind, at: ev.at, data: ev.data, pax, receivedAt: received });
  return { ok: true, receivedAt: received };
});

app.post('/api/services/:id/end', async (req) => {
  const id = Number((req.params as { id: string }).id);
  db.prepare('UPDATE services SET ended_at=? WHERE id=? AND ended_at IS NULL').run(Date.now(), id);
  io.to('centre').emit('service-end', { id });
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
}));

const dist = resolve('dist');
if (existsSync(dist)) {
  await app.register(fastifyStatic, { root: dist });
  app.setNotFoundHandler((_, reply) => reply.sendFile('index.html'));
}

await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
