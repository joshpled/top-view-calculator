import test from 'node:test';
import assert from 'node:assert/strict';
import { Calculator, HistoryStorage, HISTORY_KEY } from '../dist/calculator.js';

function storage(initial = null) {
  const values = new Map(initial === null ? [] : [[HISTORY_KEY, initial]]);
  let writes = 0;
  const api = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes++; values.set(key, value); },
  };
  return { values, api, store: () => new HistoryStorage(() => api), writes: () => writes };
}

test('completed calculations survive reopening; active input and carried answer do not', () => {
  const disk = storage();
  const first = new Calculator(disk.store());
  first.insert('12+3'); first.equals(); first.insert('7+');
  const reopened = new Calculator(disk.store());
  assert.deepEqual(reopened.history, [{ expression: '12+3', answer: 15 }]);
  assert.equal(reopened.expression, '');
  assert.equal(reopened.answer, null);
  assert.equal(reopened.completed, false);
  assert.equal(reopened.carriedNumber, null);
  reopened.insert('7+2'); reopened.equals();
  assert.equal(reopened.answer, 9);
  assert.deepEqual(new Calculator(disk.store()).history, [
    { expression: '12+3', answer: 15 }, { expression: '7+2', answer: 9 },
  ]);
});

test('typing, errors, repeated Enter, and C never write or clear saved history', () => {
  const disk = storage();
  const calc = new Calculator(disk.store());
  calc.equals(); calc.insert('1÷0'); calc.equals();
  assert.equal(disk.writes(), 0);
  calc.clear(); calc.insert('2+3');
  assert.equal(calc.history.length, 0);
  assert.equal(disk.writes(), 0);
  calc.equals(); calc.equals(); calc.clear();
  assert.equal(disk.writes(), 1);
  assert.deepEqual(new Calculator(disk.store()).history, [{ expression: '2+3', answer: 5 }]);
});

test('keeps the latest 100 completed calculations in memory and storage', () => {
  const disk = storage();
  const calc = new Calculator(disk.store());
  for (let i = 0; i < 105; i++) { calc.insert(String(i)); calc.equals(); }
  const reopened = new Calculator(disk.store());
  assert.equal(reopened.history.length, 100);
  assert.equal(reopened.history[0].answer, 5);
  assert.equal(reopened.history.at(-1).answer, 104);
  assert.equal(JSON.parse(disk.values.get(HISTORY_KEY)).entries.length, 100);
});

test('restores raw answers and resolved full-precision continuation expressions', () => {
  const disk = storage();
  const calc = new Calculator(disk.store());
  calc.insert('1÷3'); calc.equals(); calc.insert('×'); calc.insert('3'); calc.equals();
  const reopened = new Calculator(disk.store());
  assert.deepEqual(reopened.history, [
    { expression: '1÷3', answer: 1 / 3 }, { expression: '(0.3333333333333333) × 3', answer: 1 },
  ]);
});

test('maximum-length expressions remain readable even with escaped whitespace', () => {
  const disk = storage();
  const calc = new Calculator(disk.store());
  for (let i = 0; i < 100; i++) { calc.edit('\v'.repeat(499) + '1'); calc.equals(); }
  const store = disk.store();
  assert.equal(store.load().length, 100);
  assert.equal(store.error, '');
});

test('missing history starts empty without writing to storage', () => {
  const disk = storage();
  const store = disk.store();
  assert.deepEqual(store.load(), []);
  assert.equal(store.error, '');
  assert.equal(disk.writes(), 0);
});

for (const raw of ['{broken', 'null', '[]', '{"version":2,"entries":[]}',
  '{"version":1,"entries":{}}', ' '.repeat(400001)]) {
  test(`unreadable history is recoverable (${raw.length > 30 ? 'oversized data' : raw})`, () => {
    const disk = storage(raw);
    const store = disk.store();
    const calc = new Calculator(store);
    assert.deepEqual(calc.history, []);
    assert.match(store.error, /could not be loaded/);
    assert.equal(disk.values.get(HISTORY_KEY), raw); // No destructive startup write.
    calc.insert('2+3'); calc.equals();
    assert.equal(calc.answer, 5);
    assert.equal(store.error, '');
    assert.equal(new Calculator(disk.store()).history[0].answer, 5);
  });
}

test('skips malformed entries, strips unexpected properties, and bounds restored rows', () => {
  const entries = Array.from({ length: 105 }, (_, i) => ({ expression: String(i), answer: i, extra: 'unused' }));
  entries.push(null, {}, { expression: 3, answer: 3 }, { expression: ' ', answer: 1 },
    { expression: '1'.repeat(501), answer: 1 }, { expression: '<img src=x>', answer: 1 },
    { expression: '1', answer: '1' }, { expression: '1', answer: null });
  // JSON can parse a numeric literal larger than Number.MAX_VALUE into Infinity.
  const raw = JSON.stringify({ version: 1, entries }).replace('"entries":[', '"entries":[{"expression":"1e309","answer":1e309},');
  const store = storage(raw).store();
  const restored = store.load();
  assert.equal(restored.length, 100);
  assert.deepEqual(restored[0], { expression: '5', answer: 5 });
  assert.deepEqual(restored.at(-1), { expression: '104', answer: 104 });
  assert.match(store.error, /Some saved calculations/);
});

test('blocked storage access still allows arithmetic and fresh input', () => {
  const store = new HistoryStorage(() => { throw new Error('SecurityError'); });
  const calc = new Calculator(store);
  assert.match(store.error, /could not be loaded/);
  calc.insert('12+3'); calc.equals();
  assert.equal(calc.answer, 15);
  assert.equal(calc.error, '');
  assert.match(store.error, /could not be saved/);
  calc.insert('7');
  assert.equal(calc.expression, '7');
  assert.equal(calc.history.length, 1);
});

test('a quota failure preserves both earlier saved data and session history; later save retries', () => {
  const disk = storage(JSON.stringify({ version: 1, entries: [{ expression: '2+3', answer: 5 }] }));
  const saved = disk.api.setItem;
  disk.api.setItem = () => { throw new Error('QuotaExceededError'); };
  const store = disk.store();
  const calc = new Calculator(store);
  calc.insert('7+2'); calc.equals();
  assert.equal(calc.answer, 9);
  assert.equal(calc.history.length, 2);
  assert.equal(new Calculator(disk.store()).history.length, 1);
  assert.match(store.error, /could not be saved/);
  disk.api.setItem = saved;
  calc.insert('4'); calc.equals();
  assert.equal(store.error, '');
  assert.equal(new Calculator(disk.store()).history.length, 3);
});

test('history writes preserve unrelated localStorage keys', () => {
  const disk = storage();
  disk.values.set('other-app', 'keep');
  const calc = new Calculator(disk.store());
  calc.insert('6'); calc.equals();
  assert.equal(disk.values.get('other-app'), 'keep');
  assert.deepEqual([...disk.values.keys()].sort(), ['other-app', HISTORY_KEY].sort());
});
