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
import { once } from 'node:events';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
/** The verbs that pause after acting, and so read `settle`. */
const SETTLES = ['goto', 'click', 'tap', 'fill'];

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
    // Strict keys, and `settle` only on the verbs that read it. A misspelt
    // `setle`, or a `settle` on a `shot`, used to be accepted in silence
    // and the step ran with the default — which photographs a screen
    // mid-transition, the same "carries on and captures the wrong thing"
    // this validator exists to stop.
    const allowed = [verb];
    if (SETTLES.includes(verb)) allowed.push('settle');
    if (verb === 'fill') allowed.push('text');
    const extra = Object.keys(step).filter((key) => !allowed.includes(key));
    if (extra.length > 0)
      throw new Error(
        `${where}: ${verb} takes (${allowed.join(', ')}), ` +
          `not ${extra.join(', ')}`,
      );
    // A name, not a path, and checked here rather than forty seconds into
    // the run.
    if (verb === 'shot' && !/^[A-Za-z0-9._-]+$/.test(step.shot))
      throw new Error(`${where}: shot "${step.shot}" is not a plain name`);
    if (verb === 'wait') {
      if (!(Number.isFinite(step.wait) && step.wait >= 0))
        throw new Error(`${where}: wait takes a number of milliseconds`);
    } else if (typeof step[verb] !== 'string' || step[verb].length === 0) {
      throw new Error(`${where}: ${verb} takes a non-empty string`);
    }
    if (verb === 'fill' && typeof step.text !== 'string')
      throw new Error(`${where}: fill also takes a "text" string`);
    if ('settle' in step && !(Number.isFinite(step.settle) && step.settle >= 0))
      throw new Error(`${where}: settle takes a number of milliseconds`);
  });
  return steps;
}

const steps = validate(JSON.parse(readFileSync(stepsFile, 'utf8')));
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const profile = mkdtempSync(join(tmpdir(), 'juno-web-drive-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    // Port zero: Chrome picks a free one and writes it into the profile.
    // A fixed port is how a run reaches a browser it did not start — an
    // orphan from a previous run answers first, and the whole run then
    // drives that browser, with that run's session in it. Asking the
    // child where it is listening cannot pick up somebody else's.
    '--remote-debugging-port=0',
    // A profile of its own, thrown away after. A fixed directory carries
    // the last run's session in localStorage, and the run then starts
    // signed in as whoever it was last time — which is how a run meant to
    // photograph the door photographed the deck instead (2026-09-18).
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

/**
 * Stop the browser. SIGKILL, not SIGTERM: this is a throwaway headless
 * browser with nothing to save, and a graceful shutdown spends a second
 * writing files back into the directory we are about to delete — which is
 * how the delete below used to fail.
 */
function killChrome() {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return false;
  try {
    chrome.kill('SIGKILL');
  } catch {
    // already gone
  }
  return true;
}

/**
 * Delete the profile, and never fail the run over it. A directory left
 * behind is a few megabytes in the temporary folder; an exception here
 * would replace whatever the run was actually reporting — and on the happy
 * path it would turn a run whose screenshots were all written into a
 * non-zero exit.
 */
function removeProfile({ tries = 1, quiet = false } = {}) {
  let last;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      rmSync(profile, { recursive: true, force: true });
      return true;
    } catch (error) {
      // Chrome writes a few files on its way out even under SIGKILL, and
      // `rmSync` then reports ENOTEMPTY on a directory it has just half
      // emptied. Trying again is what clears it.
      last = error;
    }
  }
  if (!quiet)
    console.error(`  warn  could not remove ${profile}: ${last.message}`);
  return false;
}

/**
 * Every path out of this script ends here: the steps, the setup, and a
 * Ctrl-C. Waiting for the process to be gone before deleting is the point
 * — without it the directory survives and the delete throws.
 */
async function shutDown({ keepProfile = false } = {}) {
  if (killChrome()) {
    // The timeout is cleared when the exit wins. An `AbortController` on
    // the `once` side does not do it — that is the branch that already
    // settled — and the un-cleared timer keeps the event loop alive, so a
    // finished run sits there for the rest of the two seconds.
    let timer;
    await Promise.race([
      once(chrome, 'exit'),
      new Promise((wake) => {
        timer = setTimeout(wake, 2000);
      }),
    ]);
    clearTimeout(timer);
  }
  if (keepProfile) return;
  // Three passes, a breath apart: the directory is gone on the first one
  // most of the time, and on the second whenever it is not. Only the last
  // one is allowed to complain.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (removeProfile({ quiet: true })) return;
    await sleep(200);
  }
  removeProfile();
}

/** The synchronous half, for the handlers that cannot await. */
/**
 * The synchronous half, for the handlers that cannot await. The pause
 * between attempts is the point of retrying at all — Chrome is still
 * closing files — and `Atomics.wait` is the only way to take one without
 * an event loop turn.
 */
function shutDownNow() {
  killChrome();
  const clock = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < 2; attempt++) {
    if (removeProfile({ quiet: true })) return;
    Atomics.wait(clock, 0, 0, 200);
  }
  removeProfile();
}

for (const fatal of ['uncaughtException', 'unhandledRejection']) {
  process.on(fatal, (error) => {
    // Reported before anything is cleaned up: a cleanup that went wrong
    // must not be the only thing printed when the run died of something
    // else. The error itself rather than `String(error)`, for the stack.
    console.error(error);
    shutDownNow();
    process.exitCode = 1;
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    // `process.exit`, not `exitCode`: registering a listener suppresses the
    // default terminate, and the main flow is usually parked on a protocol
    // reply that will never come now that the browser is being killed. An
    // unsettled top-level await ends the process with its own code, not
    // the one set here.
    shutDownNow();
    process.exit(130);
  });
}

/**
 * Where the browser this script started is listening. Chrome writes the
 * port and the websocket path into `DevToolsActivePort` in its own
 * profile once it is ready, so this asks the child rather than guessing.
 */
async function debuggerUrl() {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 60; attempt++) {
    if (chrome.exitCode !== null || chrome.signalCode !== null)
      throw new Error(
        `Chrome stopped before it was ready (${chrome.signalCode ?? chrome.exitCode})`,
      );
    // Chrome creates the file and then writes it, so a read can land on an
    // empty first line. An empty port makes `http://127.0.0.1:/json/list`
    // parse as port 80 — a browser this script did not start, which is the
    // whole thing the port-zero launch is avoiding.
    const port = existsSync(portFile)
      ? Number(readFileSync(portFile, 'utf8').split('\n')[0])
      : Number.NaN;
    if (Number.isInteger(port) && port > 0) {
      try {
        const list = await fetch(`http://127.0.0.1:${port}/json/list`, {
          // undici waits five minutes for headers by default, which would
          // make the sixty attempts below a five-hour bound rather than a
          // fifteen-second one.
          signal: AbortSignal.timeout(1000),
        }).then((r) => r.json());
        const page = list.find((tab) => tab.type === 'page');
        if (page) return page.webSocketDebuggerUrl;
      } catch {
        // written, but not serving yet
      }
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

// A browser that dies mid-run closes the socket, and every caller parked
// on a reply would otherwise wait for ever — including the failure-shot
// capture in the catch below, which is where a dying browser lands.
socket.addEventListener('close', () => {
  for (const [, waiting] of pending) {
    waiting.fail(new Error('the browser closed the connection'));
  }
  pending.clear();
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
let failureShot = null;
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
      // A name, not a path: `../../x` would write outside `outDir`.
      if (!/^[A-Za-z0-9._-]+$/.test(step.shot))
        throw new Error(`shot "${step.shot}" is not a plain file name`);
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
    // Not into `outDir`: that is `screenshots/`, which is tracked, and a
    // failed run must not leave the working tree dirty — the battery's own
    // precondition is a clean tree before and after. The path is printed
    // so it can be opened; it goes with the profile directory.
    failureShot = join(profile, 'failure.png');
    writeFileSync(failureShot, Buffer.from(data, 'base64'));
    console.error(`  shot  ${failureShot} (on failure)`);
    console.error(await evaluate('document.body.innerText.slice(0, 700)'));
  } catch {
    // the page is past asking
  }
}

socket.close();
await shutDown({ keepProfile: failureShot !== null });
if (failed) {
  console.error(String(failed));
  process.exit(1);
}
console.log('done');
