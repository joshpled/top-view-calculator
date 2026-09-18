const MAX_LENGTH = 500;
const MAX_HISTORY = 100;
export const HISTORY_KEY = 'top-view-calculator.history.v1';

/** Storage failures must never prevent arithmetic or erase the current session. */
export class HistoryStorage {
  error = '';

  // A getter keeps even access to window.localStorage inside the error boundary.
  constructor(getStorage) { this.getStorage = getStorage; }

  load() {
    try {
      const raw = this.getStorage().getItem(HISTORY_KEY);
      if (raw === null) { this.error = ''; return []; }
      // Allow even 100 maximum-length expressions with six-character JSON escapes.
      if (raw.length > 400000) throw new Error('Oversized history');
      const data = JSON.parse(raw);
      if (data?.version !== 1 || !Array.isArray(data.entries)) throw new Error('Invalid history');
      const valid = data.entries.filter(entry => entry &&
        typeof entry.expression === 'string' && entry.expression.trim().length > 0 &&
        entry.expression.length <= MAX_LENGTH && /^[0-9eE.+−×÷*/()\s-]+$/.test(entry.expression) &&
        Number.isFinite(entry.answer));
      this.error = valid.length === data.entries.length ? '' : 'Some saved calculations could not be restored.';
      // Restore text and the original answer, not a re-evaluation of rounded continuation text.
      return valid.slice(-MAX_HISTORY).map(({ expression, answer }) => ({ expression, answer }));
    } catch {
      this.error = 'Saved history could not be loaded. You can still calculate.';
      return [];
    }
  }

  save(history) {
    try {
      this.getStorage().setItem(HISTORY_KEY, JSON.stringify({ version: 1, entries: history.slice(-MAX_HISTORY) }));
      this.error = '';
    } catch {
      this.error = 'History could not be saved. New calculations stay only until you close or reload.';
    }
  }
}

/** Recursive descent keeps arithmetic separate from JavaScript execution. */
export function evaluateExpression(source, carriedNumber = null) {
  const text = source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
  if (text.length > MAX_LENGTH) throw new Error('Keep the expression under 500 characters.');
  if (!text.trim()) throw new Error('Enter a calculation.');
  const tokens = [];
  let offset = 0;
  while (offset < text.length) {
    if (/\s/.test(text[offset])) { offset++; continue; }
    const number = text.slice(offset).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      const value = carriedNumber?.start === offset && carriedNumber.length === number[0].length
        ? carriedNumber.value : Number(number[0]);
      if (!Number.isFinite(value)) throw new Error('That number is too large.');
      tokens.push({ type: 'number', value });
      offset += number[0].length;
    } else if ('+-*/()'.includes(text[offset])) {
      tokens.push({ type: text[offset++] });
    } else {
      throw new Error('Use numbers, parentheses, and + − × ÷.');
    }
  }
  let position = 0;
  const peek = () => tokens[position]?.type;
  function primary() {
    if (peek() === '+' || peek() === '-') {
      const sign = tokens[position++].type;
      return (sign === '-' ? -1 : 1) * primary();
    }
    if (peek() === 'number') return tokens[position++].value;
    if (peek() === '(') {
      position++;
      const value = sum();
      if (peek() !== ')') throw new Error('Close the parenthesis to finish.');
      position++;
      return value;
    }
    throw new Error(peek() === ')' ? 'Check the parentheses.' : 'Finish the expression.');
  }
  function product() {
    let value = primary();
    while (peek() === '*' || peek() === '/' || peek() === '(' ||
      (peek() === 'number' && tokens[position - 1]?.type === ')')) {
      const operator = peek();
      if (operator === '*' || operator === '/') position++;
      const right = primary();
      if (operator === '/' && right === 0) throw new Error('Cannot divide by zero.');
      value = operator === '/' ? value / right : value * right;
      if (!Number.isFinite(value)) throw new Error('The result is too large.');
    }
    return value;
  }
  function sum() {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[position++].type;
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }
  const value = sum();
  if (position !== tokens.length) throw new Error('Check the numbers and parentheses.');
  if (!Number.isFinite(value)) throw new Error('The result is too large.');
  return Object.is(value, -0) ? 0 : value;
}

/** Round only the display; retain the original Number for follow-on arithmetic. */
export function formatResult(value) {
  const rounded = Number(value.toPrecision(12));
  if (Math.abs(rounded) >= 1e12 || (rounded !== 0 && Math.abs(rounded) < 1e-9)) {
    return rounded.toString().replace('-', '−');
  }
  return rounded.toLocaleString('en-US', { maximumSignificantDigits: 12 }).replace('-', '−');
}

export class Calculator {
  expression = '';
  answer = null;
  completed = false;
  error = '';
  history = [];
  carriedNumber = null;

  constructor(historyStorage = null) {
    this.historyStorage = historyStorage;
    this.history = historyStorage?.load() ?? [];
  }

  edit(value) {
    this.expression = value.slice(0, MAX_LENGTH);
    this.completed = false;
    this.error = '';
    this.carriedNumber = null;
  }

  resolvedExpression() {
    const carried = this.carriedNumber;
    if (carried?.label !== 'answer') return this.expression;
    // Parentheses preserve a signed value and implicit multiplication when history is recalled.
    return this.expression.slice(0, carried.start) + `(${carried.value})` +
      this.expression.slice(carried.start + carried.length);
  }

  currentValue() {
    return evaluateExpression(this.resolvedExpression(), this.carriedNumber?.label ? null : this.carriedNumber);
  }

  // Show the same 12-digit answer the user saw, without losing its numeric precision.
  useAnswer(value = this.answer) {
    const text = Number(value.toPrecision(12)).toString();
    this.edit(text);
    const start = text.startsWith('-') ? 1 : 0;
    this.carriedNumber = { start, length: text.length - start, value: Math.abs(value) };
  }

  replace(value, start, end) {
    const label = this.carriedNumber?.label && this.carriedNumber;
    if (label && start < label.start + label.length && end > label.start) {
      // Treat the generated word as one token when deleting or replacing its letters.
      start = Math.min(start, label.start);
      end = Math.max(end, label.start + label.length);
    }
    const next = this.expression.slice(0, start) + value + this.expression.slice(end);
    if (next.length > MAX_LENGTH) { this.error = 'Keep the expression under 500 characters.'; return start; }
    let carried = this.carriedNumber && { ...this.carriedNumber };
    if (carried) {
      if (end <= carried.start) carried.start += value.length - (end - start);
      else if (start < carried.start + carried.length) carried = null;
      const token = carried && next.slice(carried.start).match(carried.label
        ? /^answer(?![\w.])/ : /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (carried && token?.[0].length !== carried.length) carried = null;
    }
    this.edit(next);
    this.carriedNumber = carried;
    return start + value.length;
  }

  insert(value, start = this.expression.length, end = start) {
    if (this.completed) {
      if (/^[+−×÷*/-]$/.test(value)) {
        const previous = this.answer;
        const operator = ({ '*': '×', '/': '÷', '-': '−' })[value] ?? value;
        this.edit(`answer ${operator} `);
        this.carriedNumber = { start: 0, length: 6, value: previous, label: 'answer' };
        return this.expression.length;
      }
      this.edit('');
      start = end = this.expression.length;
    }
    return this.replace(value, start, end);
  }

  backspace(start = this.expression.length, end = start) {
    const from = start === end ? Math.max(0, start - 1) : start;
    return this.replace('', from, end);
  }

  paste(value, start = this.expression.length, end = start) {
    if (value.length > MAX_LENGTH) { this.error = 'Keep the expression under 500 characters.'; return start; }
    if (this.completed) { this.clear(); start = end = 0; }
    return this.insert(value, start, end);
  }

  clear() { this.edit(''); this.answer = null; }

  recall(index, part) {
    const entry = this.history[index];
    if (!Number.isInteger(index) || !entry || !['expression', 'answer'].includes(part)) return false;
    this.answer = null;
    if (part === 'answer') this.useAnswer(entry.answer);
    else this.edit(entry.expression);
    return true;
  }

  toggleSign() {
    if (this.completed) { this.useAnswer(-this.answer); return; }
    if (!this.expression) { this.edit('−'); return; }
    if (this.expression === '−' || this.expression === '-') { this.edit(''); return; }
    if (this.expression.startsWith('−(') && this.expression.endsWith(')')) {
      // Unwrap only when those parentheses enclose the entire expression.
      let depth = 0;
      const inside = this.expression.slice(2, -1);
      let whole = true;
      for (const char of inside) { if (char === '(') depth++; if (char === ')' && --depth < 0) whole = false; }
      if (whole) {
        const carried = this.carriedNumber && { ...this.carriedNumber, start: this.carriedNumber.start - 2 };
        this.edit(inside); this.carriedNumber = carried; return;
      }
    }
    if (this.expression.length + 3 <= MAX_LENGTH) {
      const carried = this.carriedNumber && { ...this.carriedNumber, start: this.carriedNumber.start + 2 };
      this.edit(`−(${this.expression})`); this.carriedNumber = carried;
    }
    else this.error = 'Keep the expression under 500 characters.';
  }

  equals() {
    if (!this.expression.trim() || this.completed) return;
    try {
      this.answer = this.currentValue();
      this.completed = true;
      this.error = '';
      this.history.push({ expression: this.resolvedExpression(), answer: this.answer });
      if (this.history.length > MAX_HISTORY) this.history.shift();
      this.expression = '';
      this.carriedNumber = null;
    } catch (error) { this.error = error.message; return; }
    this.historyStorage?.save(this.history);
  }
}

if (typeof document !== 'undefined') {
  const historyStorage = new HistoryStorage(() => window.localStorage);
  const calculator = new Calculator(historyStorage);
  const input = document.querySelector('#expression');
  const feedback = document.querySelector('#feedback');
  const announcement = document.querySelector('#announcement');
  const history = document.querySelector('#history');
  const display = document.querySelector('#display');
  let historySignature = '';
  let recallNotice = '';
  let recallTimer;
  let sourceFlashTimer;
  let recalledSource;

  function updateFeedback() {
    const error = calculator.error || historyStorage.error;
    feedback.textContent = error || recallNotice;
    feedback.classList.toggle('recall-feedback', Boolean(recallNotice && !error));
    input.setAttribute('aria-invalid', String(Boolean(calculator.error)));
  }

  function clearRecallFeedback() {
    clearTimeout(recallTimer);
    clearTimeout(sourceFlashTimer);
    recalledSource?.classList.remove('recall-source');
    recalledSource = null;
    recallNotice = '';
    input.classList.remove('recalled');
  }

  function recallHistory(index, part, source) {
    if (!calculator.recall(index, part)) return;
    clearRecallFeedback();
    recallNotice = part === 'answer' ? 'Result loaded' : 'Calculation loaded';
    render(calculator.expression.length, false);
    input.focus({ preventScroll: true });
    input.scrollLeft = input.scrollWidth;
    recalledSource = source;
    source.classList.add('recall-source');
    // Errors retain priority in the visible feedback area; recall is still announced.
    announcement.textContent = `${recallNotice} into the input.`;
    // Keep the clicked text in view long enough to identify it before revealing the input.
    sourceFlashTimer = setTimeout(() => {
      source.classList.remove('recall-source');
      recalledSource = null;
      display.scrollTop = display.scrollHeight;
      input.classList.add('recalled');
      recallTimer = setTimeout(() => { clearRecallFeedback(); updateFeedback(); }, 1400);
    }, 200);
  }

  function render(cursor, scrollToInput = true) {
    input.value = calculator.expression;
    if (cursor !== undefined) input.setSelectionRange(cursor, cursor);
    updateFeedback();
    // Answers are added to history only by Enter/equals, never while editing.
    const rows = calculator.history;
    const signature = JSON.stringify(rows);
    if (signature !== historySignature) {
      historySignature = signature;
      history.replaceChildren(...rows.map((entry, index) => {
        const row = document.createElement('div'); row.className = 'history-row';
        const expression = document.createElement('button');
        expression.type = 'button'; expression.className = 'history-item history-expression'; expression.textContent = entry.expression;
        expression.setAttribute('aria-label', `Use calculation ${entry.expression}`);
        expression.addEventListener('click', () => recallHistory(index, 'expression', expression));
        const answer = document.createElement('button');
        answer.type = 'button'; answer.className = 'history-item history-answer'; answer.textContent = formatResult(entry.answer);
        answer.setAttribute('aria-label', `Use result ${formatResult(entry.answer)}`);
        answer.addEventListener('click', () => recallHistory(index, 'answer', answer));
        row.append(expression, answer); return row;
      }));
    }
    if (scrollToInput) display.scrollTop = display.scrollHeight;
  }

  function action(name, value) {
    clearRecallFeedback();
    let cursor;
    const start = input.selectionStart ?? calculator.expression.length;
    const end = input.selectionEnd ?? start;
    if (name === 'clear') { calculator.clear(); cursor = 0; }
    else if (name === 'backspace') cursor = calculator.backspace(start, end);
    else if (name === 'sign') { calculator.toggleSign(); cursor = calculator.expression.length; }
    else if (name === 'equals') { calculator.equals(); cursor = calculator.expression.length; }
    else if (name === 'paste') cursor = calculator.paste(value, start, end);
    else cursor = calculator.insert(value, start, end);
    render(cursor);
    announcement.textContent = name === 'equals' && calculator.completed ? `Result: ${formatResult(calculator.answer)}` : '';
  }

  document.querySelectorAll('.key').forEach(button => {
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => action(button.dataset.action, button.dataset.value));
  });
  input.addEventListener('input', () => { clearRecallFeedback(); const cursor = input.selectionStart; calculator.edit(input.value); announcement.textContent = ''; render(cursor); });
  input.addEventListener('beforeinput', event => {
    if (event.cancelable && event.inputType === 'insertText' && event.data) {
      event.preventDefault(); action(undefined, event.data);
    }
  });
  input.addEventListener('paste', event => {
    event.preventDefault(); action('paste', event.clipboardData.getData('text').replaceAll('*', '×').replaceAll('/', '÷').replaceAll('-', '−'));
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape') { event.preventDefault(); action('clear'); return; }
    if (event.key === 'Enter' || event.key === '=') {
      if (event.target.tagName === 'BUTTON' && event.key === 'Enter') return;
      event.preventDefault(); action('equals'); return;
    }
    // Physical keys and keypad taps use the same fresh-entry and cursor logic.
    if (event.key === 'Backspace') { event.preventDefault(); action('backspace'); return; }
    if (/^[0-9.()+*/−÷×-]$/.test(event.key)) {
      event.preventDefault(); action(undefined, ({ '*': '×', '/': '÷', '-': '−' })[event.key] ?? event.key);
    }
  });
  render(0);

  // Optional browser-native agent access, using the same calculation flow as Enter.
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    const tool = {
      name: 'calculate_expression',
      title: 'Calculate expression',
      description: 'Evaluate arithmetic and add the expression and answer to the display and locally saved calculation history.',
      inputSchema: {
        type: 'object',
        properties: { expression: { type: 'string', minLength: 1, maxLength: MAX_LENGTH } },
        required: ['expression'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(value) {
        if (!value || typeof value.expression !== 'string' || Object.keys(value).some(key => key !== 'expression')) {
          throw new Error('Provide one arithmetic expression.');
        }
        evaluateExpression(value.expression); // Validate before changing visible state.
        calculator.edit(value.expression);
        action('equals');
        return { expression: value.expression, result: calculator.answer, displayedResult: formatResult(calculator.answer) };
      },
    };
    try {
      Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Unsupported experimental API must not affect ordinary use. */ }
    window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); });
  }
}
