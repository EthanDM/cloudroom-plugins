// No browser-test dependency: compile the helper and run real Chromium CSSOM.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = mkdtempSync(path.join(os.tmpdir(), 'css-scope-tests-'));
const plugin = path.join(repo, 'plugins/css-scope');
let browser;
let socket;
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) {
    response.writeHead(200, { 'Content-Type': 'text/css' });
    return response.end('');
  }
  const files = {
    '/helper.js': path.join(temporary, 'scope-stylesheets.js'),
    '/fixture.js': path.join(repo, 'tests/css_scope.browser.js'),
  };
  const file = files[request.url];
  response.writeHead(200, { 'Content-Type': file ? 'text/javascript' : 'text/html' });
  response.end(file ? readFileSync(file) : '<!doctype html><title>CSS scope fixture</title>');
});
try {
  execFileSync(path.join(plugin, 'node_modules/.bin/tsc'), [
    'scope-stylesheets.ts', '--target', 'es2022', '--module', 'es2022',
    '--moduleResolution', 'bundler', '--lib', 'es2022,dom,dom.iterable',
    '--skipLibCheck', '--outDir', temporary,
  ], { cwd: plugin, stdio: 'inherit' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${temporary}/profile`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = readFileSync(`${temporary}/profile/DevToolsActivePort`, 'utf8').split('\n')[0]; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!port) throw Error('Chrome debugging port did not become available');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(target => target.type === 'page');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');
  const pending = new Map();
  let nextId = 0;
  let pageLoaded;
  const loaded = new Promise(resolve => { pageLoaded = resolve; });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.loadEventFired') pageLoaded();
    if (!message.id) return;
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });
  const call = (method, params = {}) => new Promise(resolve => {
    const id = ++nextId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  await call('Page.enable');
  await call('Page.navigate', { url: origin });
  await loaded;
  const id = ++nextId;
  const result = new Promise(resolve => pending.set(id, resolve));
  socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: {
    expression: `(async () => {
      const {mountCssScope} = await import('${origin}/helper.js');
      const {runCssScopeTests} = await import('${origin}/fixture.js');
      return await runCssScopeTests(mountCssScope);
    })()`, awaitPromise: true, returnByValue: true,
  } }));
  const response = await Promise.race([result, new Promise((_, reject) => setTimeout(() => reject(Error('Fixture timed out')), 15000).unref())]);
  if (response.error || response.result.exceptionDetails) throw Error(JSON.stringify(response));
  console.log(JSON.stringify(response.result.result.value, null, 2));
} finally {
  socket?.close();
  if (browser && browser.exitCode === null) {
    browser.kill();
    await once(browser, 'exit');
  }
  server.closeAllConnections();
  server.close();
  rmSync(temporary, { recursive: true, force: true });
}
