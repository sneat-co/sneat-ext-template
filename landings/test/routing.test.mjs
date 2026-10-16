import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

// public/_redirects as [from, to, status] rows, comments and blanks dropped.
const rules = () =>
  read('public', '_redirects')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));

const wrangler = (file) =>
  JSON.parse(
    read(file)
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,\s*([}\]])/g, '$1'),
  );

test('both wrangler configs are assets-only with the SPA fallback', () => {
  for (const file of ['wrangler.jsonc', 'wrangler.demo.jsonc']) {
    const cfg = wrangler(file);
    assert.equal(cfg.main, undefined, `${file}: no Worker script, every request is free`);
    assert.equal(cfg.assets.binding, undefined, file);
    assert.equal(cfg.assets.run_worker_first, undefined, file);
    assert.equal(cfg.assets.not_found_handling, 'single-page-application', file);
  }
  assert.equal(existsSync(join(root, 'worker.js')), false);
});

test('_redirects owns only the landing root and the legacy 301s', () => {
  const rows = rules();
  // Exactly one rewrite, exact path, to the html_handling URL (not
  // /landing.html, which answers 307 and would move the browser).
  assert.deepEqual(
    rows.filter(([, , status]) => status === '200'),
    [['/', '/landing', '200']],
  );
  assert.deepEqual(
    rows.find(([from]) => from === '/landing'),
    ['/landing', '/', '301'],
  );
  for (const p of ['/en', '/en/']) {
    assert.deepEqual(
      rows.find(([from]) => from === p),
      [p, '/', '301'],
    );
  }
  for (const bare of ['privacy', 'terms']) {
    assert.deepEqual(
      rows.find(([from]) => from === `/${bare}`),
      [`/${bare}`, `/en/${bare}`, '301'],
    );
  }
  // Nothing but 200 rewrites and 301s, and no splat except the legacy /pwa/*.
  for (const [from, , status] of rows) {
    assert.ok(['200', '301'].includes(status), `${from} status ${status}`);
    if (from.includes('*')) assert.equal(from, '/pwa/*');
  }
});

test('assemble makes the app shell the root index.html and moves the landing', () => {
  const assemble = read('scripts', 'assemble-app.mjs');
  assert.match(assemble, /rename\(`\$\{DIST\}\/index\.html`, `\$\{DIST\}\/landing\.html`\)/);
  assert.match(assemble, /cp\(`\$\{BROWSER\}\/index\.html`, `\$\{DIST\}\/index\.html`/);
  assert.doesNotMatch(assemble, /index\.app/);
});
