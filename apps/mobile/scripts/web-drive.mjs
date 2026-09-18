/**
 * Drive the exported web client in headless Chrome and save screenshots.
 *
 *   node apps/mobile/scripts/web-drive.mjs <base-url> <out-dir> <steps.json>
 *
 * It exists because neither way this repo had of looking at the web client
 * can produce a phone-width PNG. Headless Chrome's `--screenshot` flag
 * clamps its window to 500 px wide, so the page lays out at 500 however
 * small the window is asked to be (measured 2026-09-17:
 * `--window-size=390,844` reports `innerWidth=500`); and the interactive
 * browser pane renders correctly but cannot write a file. This speaks the
 * DevTools protocol, where `Emulation.setDeviceMetricsOverride` gives a
 * real 390 x 844 phone viewport, and writes the PNGs itself.
 *
 * `steps.json` is an array of:
 *   { "goto": "/path" }
 *   { "click": "visible text" }         the last element reading exactly that
 *   { "fill": "testID", "text": "..." } a text field, React-safely
 *   { "wait": 1500 }
 *   { "expect": "visible text" }        fails the run if the page lacks it
 *   { "shot": "name" }                  writes <out-dir>/<name>.png
 *
 * Node and Chrome only: the protocol is JSON over a WebSocket, which Node
 * has had since 22, so this adds no dependency.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9223;
const [baseUrl, outDir, stepsFile] = process.argv.slice(2);

if (!baseUrl || !outDir || !stepsFile) {
  console.error('usage: web-drive.mjs <base-url> <out-dir> <steps.json>');
  process.exit(1);
}

/**
 * The steps file is an external boundary like any other, and an unchecked
 * one fails in the worst way available: `{"fill": "email"}` with no `text`
 * types the string "undefined" into the field and the run carries on and
 * photographs the wrong thing.
 */
const VERBS = ['goto', 'click', 'tap', 'fill', 'wait', 'expect', 'shot'];

function validate(steps) {
  if (!Array.isArray(steps)) throw new Error('steps must be an array');
  steps.forEach((step, at) => {
    const where = `step ${at + 1}`;
    if (step === null || typeof step !== 'object')
      throw new Error(`${where} is not an object`);
    const verbs = VERBS.filter((verb) => verb in step);
    if (verbs.length !== 1)
      throw new Error(
        `${where} names ${verbs.length === 0 ? 'no' : verbs.length} verbs; ` +
          `each step takes exactly one of ${VERBS.join(', ')}`,
      );
    const [verb] = verbs;
    if (verb === 'wait') {
      if (typeof step.wait !== 'number' || !(step.wait >= 0))
        throw new Error(`${where}: wait takes a number of milliseconds`);
    } else if (typeof step[verb] !== 'string' || step[verb].length === 0) {
      throw new Error(`${where}: ${verb} takes a non-empty string`);
    }
    if (verb === 'fill' && typeof step.text !== 'string')
      throw new Error(`${where}: fill also takes a "text" string`);
    if ('settle' in step && typeof step.settle !== 'number')
      throw new Error(`${where}: settle takes a number of milliseconds`);
  });
  return steps;
}

const steps = validate(JSON.parse(readFileSync(stepsFile, 'utf8')));
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/juno-web-drive',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

/** Chrome needs a moment before its debugging port answers. */
async function debuggerUrl() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
        r.json(),
      );
      const page = list.find((tab) => tab.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // not listening yet
    }
    await sleep(250);
  }
  throw new Error('Chrome never opened its debugging port');
}

const socket = new WebSocket(await debuggerUrl());
await new Promise((open, fail) => {
  socket.addEventListener('open', open, { once: true });
  socket.addEventListener('error', fail, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const waiting = pending.get(message.id);
  if (!waiting) return;
  pending.delete(message.id);
  if (message.error) waiting.fail(new Error(JSON.stringify(message.error)));
  else waiting.done(message.result);
});

const send = (method, params = {}) =>
  new Promise((done, fail) => {
    const id = ++nextId;
    pending.set(id, { done, fail });
    socket.send(JSON.stringify({ id, method, params }));
  });

/** Evaluate in the page, returning the value or throwing what it threw. */
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        JSON.stringify(result.exceptionDetails),
    );
  }
  return result.result.value;
}

/**
 * React owns a controlled input's value, so assigning `.value` changes the
 * DOM and is overwritten on the next render. The native setter plus a
 * bubbling `input` event is what React's own event system listens for.
 */
const byTestId = (testID) => JSON.stringify(`[data-testid="${testID}"]`);

const FILL = (testID, text) => `(() => {
  const field = document.querySelector(${byTestId(testID)});
  if (!field) throw new Error('no field named ' + ${JSON.stringify(testID)});
  const proto = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, ${JSON.stringify(text)});
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;

const CLICK = (text) => `(() => {
  const wanted = ${JSON.stringify(text)};
  const hit = [...document.querySelectorAll('div,span,button,a,p')]
    .filter((el) => el.textContent?.trim() === wanted)
    .pop();
  if (!hit) throw new Error('no element reading ' + wanted);
  const box = hit.getBoundingClientRect();
  const at = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: box.left + box.width / 2,
    clientY: box.top + box.height / 2,
  };
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    hit.dispatchEvent(new MouseEvent(type, at));
  }
  return true;
})()`;

const TAP = (testID) => `(() => {
  const hit = document.querySelector(${byTestId(testID)});
  if (!hit) throw new Error('no element with testID ' + ${JSON.stringify(testID)});
  const box = hit.getBoundingClientRect();
  const at = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: box.left + box.width / 2,
    clientY: box.top + box.height / 2,
  };
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    hit.dispatchEvent(new MouseEvent(type, at));
  }
  return true;
})()`;

await send('Page.enable');
await send('Runtime.enable');
// A phone, not a small window: the part `--window-size` cannot do.
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});

let failed = null;
try {
  for (const step of steps) {
    if (step.goto !== undefined) {
      await send('Page.navigate', { url: baseUrl + step.goto });
      await sleep(step.settle ?? 3500);
    } else if (step.click !== undefined) {
      await evaluate(CLICK(step.click));
      await sleep(step.settle ?? 1200);
    } else if (step.tap !== undefined) {
      await evaluate(TAP(step.tap));
      await sleep(step.settle ?? 1200);
    } else if (step.fill !== undefined) {
      await evaluate(FILL(step.fill, step.text));
      await sleep(step.settle ?? 300);
    } else if (step.wait !== undefined) {
      await sleep(step.wait);
    } else if (step.expect !== undefined) {
      const seen = await evaluate(
        `document.body.innerText.includes(${JSON.stringify(step.expect)})`,
      );
      if (!seen) throw new Error(`the page does not read "${step.expect}"`);
      console.log(`  ok    reads "${step.expect}"`);
    } else if (step.shot !== undefined) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const file = join(outDir, `${step.shot}.png`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(`  shot  ${file}`);
    } else {
      throw new Error(`unknown step: ${JSON.stringify(step)}`);
    }
  }
} catch (error) {
  failed = error;
  try {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(outDir, 'failure.png'), Buffer.from(data, 'base64'));
    console.error(`  shot  ${join(outDir, 'failure.png')} (on failure)`);
    console.error(await evaluate('document.body.innerText.slice(0, 700)'));
  } catch {
    // the page is past asking
  }
}

socket.close();
chrome.kill();
if (failed) {
  console.error(String(failed));
  process.exit(1);
}
console.log('done');
