const MAX_LENGTH = 500;

/** Recursive descent keeps arithmetic separate from JavaScript execution. */
export function evaluateExpression(source) {
  const text = source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
  if (text.length > MAX_LENGTH) throw new Error('Keep the expression under 500 characters.');
  if (!text.trim()) throw new Error('Enter a calculation.');
  const tokens = [];
  let offset = 0;
  while (offset < text.length) {
    if (/\s/.test(text[offset])) { offset++; continue; }
    const number = text.slice(offset).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      const value = Number(number[0]);
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

  edit(value) {
    this.expression = value.slice(0, MAX_LENGTH);
    this.completed = false;
    this.error = '';
  }

  insert(value, start = this.expression.length, end = start) {
    if (this.completed) {
      this.expression = /^[+−×÷*/-]/.test(value) ? String(this.answer) : '';
      start = end = this.expression.length;
    }
    const next = this.expression.slice(0, start) + value + this.expression.slice(end);
    if (next.length > MAX_LENGTH) { this.error = 'Keep the expression under 500 characters.'; return start; }
    this.edit(next);
    return start + value.length;
  }

  backspace(start = this.expression.length, end = start) {
    const from = start === end ? Math.max(0, start - 1) : start;
    this.edit(this.expression.slice(0, from) + this.expression.slice(end));
    return from;
  }

  paste(value, start = this.expression.length, end = start) {
    if (value.length > MAX_LENGTH) { this.error = 'Keep the expression under 500 characters.'; return start; }
    if (this.completed) { this.clear(); start = end = 0; }
    return this.insert(value, start, end);
  }

  clear() { this.edit(''); this.answer = null; }

  toggleSign() {
    if (this.completed) { this.edit(String(-this.answer)); return; }
    if (!this.expression) { this.edit('−'); return; }
    if (this.expression === '−' || this.expression === '-') { this.edit(''); return; }
    if (this.expression.startsWith('−(') && this.expression.endsWith(')')) {
      // Unwrap only when those parentheses enclose the entire expression.
      let depth = 0;
      const inside = this.expression.slice(2, -1);
      let whole = true;
      for (const char of inside) { if (char === '(') depth++; if (char === ')' && --depth < 0) whole = false; }
      if (whole) { this.edit(inside); return; }
    }
    if (this.expression.length + 3 <= MAX_LENGTH) this.edit(`−(${this.expression})`);
    else this.error = 'Keep the expression under 500 characters.';
  }

  equals() {
    if (!this.expression.trim() || this.completed) return;
    try {
      this.answer = evaluateExpression(this.expression);
      this.completed = true;
      this.error = '';
      this.history.push({ expression: this.expression, answer: this.answer });
      if (this.history.length > 100) this.history.shift();
    } catch (error) { this.error = error.message; }
  }
}

if (typeof document !== 'undefined') {
  const calculator = new Calculator();
  const input = document.querySelector('#expression');
  const result = document.querySelector('#result');
  const feedback = document.querySelector('#feedback');
  const announcement = document.querySelector('#announcement');
  const history = document.querySelector('#history');
  let historySignature = '';

  function render(cursor) {
    input.value = calculator.expression;
    if (cursor !== undefined) input.setSelectionRange(cursor, cursor);
    feedback.textContent = calculator.error;
    input.setAttribute('aria-invalid', String(Boolean(calculator.error)));
    let value = calculator.completed ? calculator.answer : null;
    if (!calculator.completed && calculator.expression.trim()) {
      try { value = evaluateExpression(calculator.expression); } catch { /* In-progress input is quiet until Enter. */ }
    }
    result.textContent = value === null ? (calculator.expression ? '—' : '0') : formatResult(value);
    result.classList.toggle('is-preview', !calculator.completed);
    // Keep the latest completed calculation in the current display until editing resumes.
    const rows = calculator.completed ? calculator.history.slice(0, -1) : calculator.history;
    const signature = JSON.stringify(rows);
    if (signature !== historySignature) {
      historySignature = signature;
      history.replaceChildren(...rows.map(entry => {
        const row = document.createElement('div'); row.className = 'history-row';
        const expression = document.createElement('div'); expression.className = 'history-expression'; expression.textContent = entry.expression;
        const answer = document.createElement('div'); answer.className = 'history-answer'; answer.textContent = formatResult(entry.answer);
        row.append(expression, answer); return row;
      }));
      history.scrollTop = history.scrollHeight;
    }
  }

  function action(name, value) {
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
  input.addEventListener('input', () => { const cursor = input.selectionStart; calculator.edit(input.value); announcement.textContent = ''; render(cursor); });
  input.addEventListener('beforeinput', event => {
    if (calculator.completed && event.inputType === 'insertText' && event.data) {
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
    if (event.target === input) return;
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
      description: 'Evaluate arithmetic and add the expression and answer to this calculator display and session history.',
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
        return { expression: calculator.expression, result: calculator.answer, displayedResult: formatResult(calculator.answer) };
      },
    };
    try {
      Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Unsupported experimental API must not affect ordinary use. */ }
    window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); });
  }
}
