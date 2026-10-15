import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';

mkdirSync('data', { recursive: true });
export const db = new DatabaseSync(process.env.MAHATTA_DB ?? 'data/mahatta.db');
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver TEXT NOT NULL, rame TEXT NOT NULL, cab TEXT NOT NULL, train TEXT NOT NULL,
  started_at INTEGER NOT NULL, ended_at INTEGER
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id),
  client_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL, data TEXT NOT NULL,
  at INTEGER NOT NULL, received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS validations (
  client_id TEXT PRIMARY KEY, validated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY, passenger_id TEXT NOT NULL, product TEXT NOT NULL,
  valid_from INTEGER NOT NULL, valid_to INTEGER, trips_left INTEGER,
  price INTEGER NOT NULL, last_window INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, passenger_id TEXT, category TEXT NOT NULL,
  train TEXT, text TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train TEXT NOT NULL, fr TEXT NOT NULL, ar TEXT NOT NULL,
  created_at INTEGER NOT NULL, acked_at INTEGER
);
`);
