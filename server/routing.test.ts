import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRoutes } from '../shared/routing.ts';

test('direct route when both stations share a line', () => {
  const r = computeRoutes('Alger', 'Oran', 480);
  assert.ok(r.length >= 1);
  assert.equal(r[0].legs.length, 1);
  assert.equal(r[0].legs[0].k, 'GO');
});
test('one change when no common line', () => {
  const r = computeRoutes('Rouiba', 'Aéroport', 480);
  assert.ok(r.length >= 1);
  assert.equal(r[0].legs.length, 2);
});
test('blocked line is avoided and delays are added', () => {
  assert.equal(computeRoutes('Alger', 'Oran', 480, {}, ['GO']).length, 0);
  const base = computeRoutes('Alger', 'Oran', 480)[0];
  const late = computeRoutes('Alger', 'Oran', 480, { GO: 12 })[0];
  assert.equal(late.arr - base.arr, 12);
});
test('unknown or identical stations give nothing', () => {
  assert.deepEqual(computeRoutes('Alger', 'Alger', 480), []);
  assert.deepEqual(computeRoutes('Nowhere', 'Alger', 480), []);
});
