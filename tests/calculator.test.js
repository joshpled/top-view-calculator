import test from 'node:test';
import assert from 'node:assert/strict';
import { Calculator, evaluateExpression, formatResult } from '../dist/calculator.js';

const cases = [
  ['310.40+761.99', 1072.39], ['2+3×4', 14], ['(2+3)×4', 20],
  ['18÷3÷2', 3], ['12÷(2×(2+1))', 2], ['2(3+4)', 14],
  ['(2+3)(4+5)', 45], ['(2+3)4', 20], ['6÷2(1+2)', 9],
  ['−3×4', -12], ['4÷−2', -2], ['−(2+3)', -5], ['3−−2', 5],
  ['.5+.25', .75], ['−0', 0], ['1e-7*2', 2e-7], [' 4 + 2 ', 6],
];
for (const [expression, expected] of cases) {
  test(`arithmetic: ${expression}`, () => {
    const actual = evaluateExpression(expression);
    assert.ok(Math.abs(actual - expected) <= Number.EPSILON * Math.max(1, Math.abs(expected)) * 2);
  });
}
for (const expression of ['1÷0', '0÷0', '2+', '(2+3', '2+3)', '()', '1..2', '2×÷3', '2 3', 'alert(1)', '1e309', '1e308*10']) {
  test(`rejects: ${expression}`, () => assert.throws(() => evaluateExpression(expression)));
}
test('rounds only the displayed result', () => {
  assert.equal(formatResult(evaluateExpression('0.1+0.2')), '0.3');
  assert.equal(formatResult(1 / 3), '0.333333333333');
  assert.equal(formatResult(2 / 3), '0.666666666667');
  assert.equal(formatResult(1072.39), '1,072.39');
  assert.equal(formatResult(evaluateExpression('310.40+761.99')), '1,072.39');
});
test('digits start fresh after Enter; repeated Enter does not duplicate history', () => {
  const calc = new Calculator(); calc.insert('2+3'); calc.equals(); calc.equals();
  assert.equal(calc.history.length, 1); calc.insert('7'); assert.equal(calc.expression, '7');
});
test('operators continue from the unrounded result', () => {
  const calc = new Calculator(); calc.insert('1÷3'); calc.equals(); calc.insert('×'); calc.insert('3'); calc.equals();
  assert.equal(calc.answer, 1); calc.insert('('); assert.equal(calc.expression, '(');
});
test('cursor insertion, range replacement, backspace, and clear', () => {
  const calc = new Calculator(); calc.insert('12+3'); calc.backspace();
  assert.equal(calc.expression, '12+'); calc.insert('5', 0, 2);
  assert.equal(calc.expression, '5+'); calc.backspace(0, 1);
  assert.equal(calc.expression, '+'); calc.clear(); assert.equal(calc.expression, '');
});
test('errors are correctable and do not enter history', () => {
  const calc = new Calculator(); calc.insert('2+'); calc.equals();
  assert.ok(calc.error); assert.equal(calc.history.length, 0);
  calc.insert('3'); calc.equals(); assert.equal(calc.answer, 5); assert.equal(calc.error, '');
  calc.clear(); assert.equal(calc.history.length, 1); assert.equal(calc.answer, null);
});
test('sign toggles the whole expression and completed answer', () => {
  const calc = new Calculator(); calc.insert('2+3'); calc.toggleSign(); calc.equals();
  assert.equal(calc.answer, -5); calc.toggleSign(); calc.equals(); assert.equal(calc.answer, 5);
  calc.clear(); calc.insert('2+3'); calc.toggleSign(); calc.toggleSign();
  assert.equal(calc.expression, '2+3');
  calc.edit('−(2)+(3)'); calc.toggleSign(); calc.equals(); assert.equal(calc.answer, -1);
});
test('empty Enter, input limit, and bounded session history', () => {
  const calc = new Calculator(); calc.equals(); assert.equal(calc.error, '');
  assert.throws(() => evaluateExpression('1'.repeat(501)));
  for (let i = 0; i < 105; i++) { calc.edit(String(i)); calc.equals(); }
  assert.equal(calc.history.length, 100); assert.equal(calc.history[0].answer, 5);
});
test('pasting a negative expression after Enter starts fresh', () => {
  const calc = new Calculator(); calc.insert('2+3'); calc.equals(); calc.paste('−7'); calc.equals();
  assert.equal(calc.answer, -7);
  calc.edit('12+3'); calc.paste('5', 0, 2); assert.equal(calc.expression, '5+3');
});
test('toggling sign twice from empty leaves a valid new entry', () => {
  const calc = new Calculator(); calc.toggleSign(); calc.toggleSign(); calc.insert('2'); calc.equals();
  assert.equal(calc.answer, 2);
});
test('Enter archives immediately and empties the second-calculation input', () => {
  const calc = new Calculator(); calc.insert('12+3'); calc.equals();
  assert.equal(calc.expression, '');
  assert.deepEqual(calc.history, [{ expression: '12+3', answer: 15 }]);
  calc.insert('7'); calc.insert('+'); calc.insert('2'); calc.equals();
  assert.equal(calc.answer, 9); assert.equal(calc.expression, '');
  assert.equal(calc.history.length, 2); assert.equal(calc.history[1].expression, '7+2');
});
test('continuation never exposes floating-point digits and keeps numeric precision', () => {
  const calc = new Calculator(); calc.insert('310.40+761.99'); calc.equals(); calc.insert('+');
  assert.equal(calc.expression, '1072.39+');
  calc.insert('1'); calc.equals(); assert.equal(formatResult(calc.answer), '1,073.39');
  calc.edit('1÷3'); calc.equals(); calc.insert('×');
  assert.equal(calc.expression, '0.333333333333×');
  calc.insert('3'); calc.equals(); assert.equal(calc.answer, 1);
});
test('editing the carried answer uses the newly entered number', () => {
  const calc = new Calculator(); calc.insert('1÷3'); calc.equals(); calc.insert('×');
  calc.insert('2', 0, 14); calc.insert('3'); calc.equals(); assert.equal(calc.answer, 6);
});
test('fresh native edits and clear cannot restore a previous expression', () => {
  const calc = new Calculator(); calc.insert('12+3'); calc.equals();
  calc.edit('7'); calc.equals(); assert.equal(calc.answer, 7);
  calc.clear(); calc.insert('4'); assert.equal(calc.expression, '4');
});
