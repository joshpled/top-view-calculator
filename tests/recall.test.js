import test from 'node:test';
import assert from 'node:assert/strict';
import { Calculator, HistoryStorage, HISTORY_KEY } from '../dist/calculator.js';

function completed(...expressions) {
  const calc = new Calculator();
  for (const expression of expressions) { calc.edit(expression); calc.equals(); }
  return calc;
}

test('recalling a calculation replaces current input without evaluating or changing history', () => {
  const calc = completed('(2+3)×4', '7+2');
  const before = structuredClone(calc.history);
  calc.insert('99+'); calc.equals();
  assert.ok(calc.error);
  assert.equal(calc.recall(0, 'expression'), true);
  assert.equal(calc.expression, '(2+3)×4');
  assert.equal(calc.completed, false);
  assert.equal(calc.answer, null);
  assert.equal(calc.error, '');
  assert.deepEqual(calc.history, before);
  calc.insert('+1'); calc.equals();
  assert.equal(calc.answer, 21);
  assert.deepEqual(calc.history.slice(0, 2), before);
});

test('recalling an earlier result uses its raw value, not the latest or displayed answer', () => {
  const calc = completed('1÷3', '7+2');
  calc.recall(0, 'answer');
  assert.equal(calc.expression, '0.333333333333');
  assert.equal(calc.answer, null);
  assert.equal(calc.completed, false);
  calc.insert('×3'); calc.equals();
  assert.equal(calc.answer, 1);
  assert.equal(calc.history.length, 3);
});

test('editing a recalled result invalidates its original precision binding', () => {
  const calc = completed('1÷3');
  calc.recall(0, 'answer'); calc.insert('2', 0, calc.expression.length);
  assert.equal(calc.carriedNumber, null);
  calc.insert('×3'); calc.equals();
  assert.equal(calc.answer, 6);
});

test('repeated recall replaces rather than appends and C clears recalled input', () => {
  const calc = completed('12+3', '7+2');
  calc.recall(0, 'answer'); calc.recall(0, 'answer');
  assert.equal(calc.expression, '15');
  calc.recall(1, 'expression');
  assert.equal(calc.expression, '7+2');
  assert.equal(calc.carriedNumber, null);
  calc.clear(); calc.insert('4');
  assert.equal(calc.expression, '4');
  assert.equal(calc.history.length, 2);
});

test('recalled result handles zero, negative values, and scientific notation', () => {
  for (const expression of ['0', '−1÷3', '1e15', '1e-12']) {
    const calc = completed(expression);
    const original = calc.answer;
    calc.recall(0, 'answer'); calc.insert('×3'); calc.equals();
    assert.equal(calc.answer, original * 3);
  }
});

test('expression recall loads the recorded text instead of resurrecting a hidden carried value', () => {
  const calc = completed('1÷3');
  calc.insert('×'); calc.insert('3'); calc.equals();
  calc.recall(0, 'answer');
  calc.recall(1, 'expression');
  assert.equal(calc.expression, '0.333333333333×3');
  assert.equal(calc.carriedNumber, null);
  calc.equals();
  assert.equal(calc.answer, 0.333333333333 * 3);
  assert.equal(calc.history[1].answer, 1);
});

test('recall after reopening is not saved until equals and preserves existing entries', () => {
  let raw = JSON.stringify({ version: 1, entries: [{ expression: '1÷3', answer: 1 / 3 }] });
  let writes = 0;
  const store = () => new HistoryStorage(() => ({
    getItem(key) { assert.equal(key, HISTORY_KEY); return raw; },
    setItem(key, value) { assert.equal(key, HISTORY_KEY); writes++; raw = value; },
  }));
  const calc = new Calculator(store());
  const original = raw;
  calc.recall(0, 'expression'); calc.recall(0, 'answer');
  assert.equal(writes, 0); assert.equal(raw, original);
  assert.equal(new Calculator(store()).expression, '');
  calc.insert('×3'); calc.equals(); calc.equals();
  assert.equal(writes, 1);
  assert.deepEqual(new Calculator(store()).history, [
    { expression: '1÷3', answer: 1 / 3 }, { expression: '0.333333333333×3', answer: 1 },
  ]);
});

test('invalid recall targets leave current input and history untouched', () => {
  const calc = completed('2+3'); calc.insert('9');
  const before = JSON.stringify(calc);
  for (const [index, part] of [[-1, 'answer'], [4, 'expression'], [0.5, 'answer'], ['0', 'answer'], [0, 'unknown']]) {
    assert.equal(calc.recall(index, part), false);
    assert.equal(JSON.stringify(calc), before);
  }
});
