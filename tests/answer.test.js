import test from 'node:test';
import assert from 'node:assert/strict';
import { Calculator, HistoryStorage, evaluateExpression } from '../dist/calculator.js';

function result(expression = '12+3') {
  const calc = new Calculator(); calc.edit(expression); calc.equals(); return calc;
}

for (const [key, display, expected] of [
  ['+', '+', 20], ['-', '−', 10], ['−', '−', 10],
  ['/', '÷', 3], ['÷', '÷', 3], ['*', '×', 75], ['×', '×', 75],
]) {
  test(`after equals ${key} displays answer ${display} and uses the last result`, () => {
    const calc = result();
    assert.equal(calc.insert(key), 9);
    assert.equal(calc.expression, `answer ${display} `);
    assert.equal(calc.completed, false);
    assert.equal(calc.history.length, 1);
    calc.insert('5');
    assert.equal(calc.history.length, 1);
    calc.equals();
    assert.equal(calc.answer, expected);
    assert.equal(calc.expression, '');
    assert.equal(calc.history.at(-1).expression, `(15) ${display} 5`);
  });
}

test('each continuation captures the latest completed result at full precision', () => {
  const calc = result('1÷3'); calc.insert('*'); calc.insert('3'); calc.equals();
  assert.equal(calc.answer, 1);
  calc.insert('+'); calc.insert('4'); calc.equals();
  assert.equal(calc.answer, 5);
  assert.equal(calc.history.at(-1).expression, '(1) + 4');
  calc.equals(); assert.equal(calc.history.length, 3);
});

test('zero, negative, tiny, and large finite answers are valid continuation values', () => {
  for (const [expression, expected] of [['0', 0], ['−5', -5], ['1e-300', 1e-300], ['1.7976931348623157e308', Number.MAX_VALUE]]) {
    const calc = result(expression); calc.insert('×'); calc.insert('1'); calc.equals();
    assert.equal(calc.answer, expected);
    assert.equal(calc.error, '');
    assert.equal(evaluateExpression(calc.history.at(-1).expression), expected);
  }
});

test('digits, decimal, and opening parenthesis after equals start fresh', () => {
  for (const key of ['7', '.', '(']) {
    const calc = result(); calc.insert(key);
    assert.equal(calc.expression, key);
    assert.equal(calc.carriedNumber, null);
  }
  const calc = result(); calc.paste('−7');
  assert.equal(calc.expression, '−7'); assert.equal(calc.carriedNumber, null);
});

test('clear, fresh startup, native replacement, and recall cannot reuse an old answer label', () => {
  const calc = result(); calc.insert('+'); calc.clear(); calc.insert('-');
  assert.equal(calc.expression, '-'); assert.equal(calc.carriedNumber, null);
  const empty = new Calculator(); empty.insert('+');
  assert.equal(empty.expression, '+');
  const native = result(); native.insert('+'); native.edit('answer + 2'); native.equals();
  assert.ok(native.error); assert.equal(native.history.length, 1);
  native.edit('7'); native.equals(); assert.equal(native.answer, 7);
  native.insert('+'); native.recall(0, 'expression');
  assert.equal(native.expression, '12+3'); assert.equal(native.carriedNumber, null);
});

test('an incomplete or divide-by-zero continuation remains correctable', () => {
  const calc = result(); calc.insert('/'); calc.equals();
  assert.ok(calc.error); assert.equal(calc.expression, 'answer ÷ ');
  calc.insert('0'); calc.equals();
  assert.match(calc.error, /divide by zero/);
  assert.equal(calc.history.length, 1);
  calc.backspace(); calc.insert('3'); calc.equals();
  assert.equal(calc.answer, 5);
});

test('editing either side of the label preserves its value; editing the label replaces it as a unit', () => {
  const calc = result('−5'); calc.insert('+'); calc.insert('2');
  calc.insert('2×', 0, 0); calc.equals();
  assert.equal(calc.answer, -8);
  assert.equal(calc.history.at(-1).expression, '2×(-5) + 2');
  const replace = result(); replace.insert('*'); replace.insert('3', 2, 4);
  assert.equal(replace.expression, '3 × '); assert.equal(replace.carriedNumber, null);
  replace.insert('2'); replace.equals(); assert.equal(replace.answer, 6);
  const backspace = result(); backspace.insert('+'); backspace.backspace(6, 6);
  assert.equal(backspace.expression, ' + '); assert.equal(backspace.carriedNumber, null);
});

test('sign toggling moves the answer binding and keeps its signed value', () => {
  const calc = result('−5'); calc.insert('+'); calc.insert('2');
  calc.toggleSign(); assert.equal(calc.expression, '−(answer + 2)');
  calc.equals(); assert.equal(calc.answer, 3);
  const twice = result('−5'); twice.insert('+'); twice.insert('2'); twice.toggleSign(); twice.toggleSign();
  twice.equals(); assert.equal(twice.answer, -3);
});

test('deleting surrounding spaces or appending digits cannot silently turn answer into a different number', () => {
  const calc = result(); calc.insert('+'); calc.insert('2');
  calc.replace('', 6, 7); assert.equal(calc.expression, 'answer+ 2');
  calc.equals(); assert.equal(calc.answer, 17);
  const invalid = result(); invalid.insert('+'); invalid.insert('2', 6, 6); invalid.equals();
  assert.ok(invalid.error); assert.equal(invalid.history.length, 1);
});

test('resolved history survives reopen and evaluates independently of the new answer', () => {
  let raw = null; let writes = 0;
  const store = () => new HistoryStorage(() => ({ getItem: () => raw, setItem: (_, value) => { raw = value; writes++; } }));
  const calc = new Calculator(store()); calc.insert('1÷3'); calc.equals();
  calc.insert('*'); calc.insert('3');
  assert.equal(writes, 1);
  assert.equal(new Calculator(store()).expression, '');
  calc.equals();
  assert.equal(writes, 2); assert.ok(!raw.includes('answer ×'));
  const reopened = new Calculator(store());
  assert.equal(reopened.history[1].expression, '(0.3333333333333333) × 3');
  reopened.insert('99'); reopened.equals(); reopened.recall(1, 'expression'); reopened.equals();
  assert.equal(reopened.answer, 1);
});

test('resolved expression length limit fails without adding history or corrupting the answer', () => {
  const calc = result('1÷3'); calc.insert('+'); calc.insert(' '.repeat(490) + '1');
  assert.equal(calc.expression.length, 500);
  calc.equals(); assert.match(calc.error, /500 characters/); assert.equal(calc.history.length, 1);
  calc.edit('2'); calc.equals(); assert.equal(calc.answer, 2);
});

test('answer is an internal bound label, not a general variable or executable input', () => {
  for (const text of ['answer+1', 'answer()', 'answer.constructor', 'answer;alert(1)']) {
    assert.throws(() => evaluateExpression(text));
  }
});
