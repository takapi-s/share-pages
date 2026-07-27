import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { PersistentPageStore } from '../src/storage.js';

async function withServer(fn) {
  const app = createApp({ ttlMs: 60 * 60 * 1000 });
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('persists pages across store instances', async () => {
  const directory = `/tmp/share-pages-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const first = new PersistentPageStore(directory);
  first.set('abc', { id: 'abc', originalName: 'persist.md', expiresAt: Date.now() + 10000 });
  const second = new PersistentPageStore(directory);
  assert.equal(second.get('abc').originalName, 'persist.md');
});

test('serves the upload UI and page list endpoint', async () => {
  await withServer(async base => {
    const ui = await fetch(base);
    assert.equal(ui.status, 200);
    const uiHtml = await ui.text();
    assert.match(uiHtml, /共有ページ/);
    assert.match(uiHtml, /dropzone/);
    assert.match(uiHtml, /api\/upload/);

    const list = await fetch(`${base}/api/pages`);
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), []);
  });
});

test('uploads markdown and renders a share page with download link', async () => {
  await withServer(async base => {
    const form = new FormData();
    form.append('file', new Blob(['# Hello\n\nWorld'], { type: 'text/markdown' }), 'hello.md');
    const upload = await fetch(`${base}/api/upload`, { method: 'POST', body: form });
    assert.equal(upload.status, 201);
    const result = await upload.json();
    assert.match(result.url, /\/p\/[A-Za-z0-9_-]+$/);

    const page = await fetch(result.url);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /<h1[^>]*>Hello<\/h1>/);
    assert.match(html, /download/);

    const download = await fetch(result.downloadUrl);
    assert.equal(download.status, 200);
    assert.equal(await download.text(), '# Hello\n\nWorld');
  });
});

test('renders full markdown structures and strips unsafe raw HTML', async () => {
  await withServer(async base => {
    const source = '# Title\n\n## Section\n\n- one\n- two\n\n> quoted\n\n| Name | Value |\n| --- | --- |\n| answer | 42 |\n\n```js\nconst answer = 42;\n```\n\n---\n\n[link](https://example.com)\n\n<script>alert(1)</script>';
    const form = new FormData();
    form.append('file', new Blob([source], { type: 'text/markdown' }), 'advanced.md');
    const result = await (await fetch(`${base}/api/upload`, { method: 'POST', body: form })).json();
    const html = await (await fetch(result.url)).text();
    assert.match(html, /<h1[^>]*>Title<\/h1>/);
    assert.match(html, /<h2[^>]*>Section<\/h2>/);
    assert.match(html, /<ul>[\s\S]*<li>one<\/li>[\s\S]*<li>two<\/li>[\s\S]*<\/ul>/);
    assert.match(html, /<blockquote>[\s\S]*quoted[\s\S]*<\/blockquote>/);
    assert.match(html, /<table>[\s\S]*<th>Name<\/th>[\s\S]*<td>42<\/td>[\s\S]*<\/table>/);
    assert.match(html, /<pre><code class="language-js">/);
    assert.match(html, /<hr>/);
    assert.match(html, /class="markdown-content"/);
    assert.match(html, /\.markdown-content hr\{/);
    assert.match(html, /\.markdown-content table\{/);
    assert.match(html, /href="https:\/\/example\.com"/);
    assert.doesNotMatch(html, /<script/i);
  });
});

test('uploads HTML and isolates it in a sandbox iframe', async () => {
  await withServer(async base => {
    const form = new FormData();
    form.append('file', new Blob(['<script>window.pwned = true</script><h1>Dashboard</h1>'], { type: 'text/html' }), 'dashboard.html');
    const upload = await fetch(`${base}/api/upload`, { method: 'POST', body: form });
    assert.equal(upload.status, 201);
    const result = await upload.json();
    const page = await fetch(result.url);
    const html = await page.text();
    assert.match(html, /sandbox=""/);
    assert.match(html, new RegExp(`/p/${result.id}/content`));
    assert.match(html, /class="tools"/);
    assert.match(html, /class="content"/);
    assert.doesNotMatch(html, /content-card/);
    assert.doesNotMatch(html, /max-width:1100px;margin:0 auto;padding:2rem 1rem/);
    assert.doesNotMatch(html, /border:1px solid #ddd/);
    assert.doesNotMatch(html, /window\.pwned/);

    const content = await fetch(`${base}/p/${result.id}/content`);
    assert.equal(content.status, 200);
    assert.equal(content.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.doesNotMatch(await content.text(), /<script>/i);
  });
});

test('rejects unsupported files and oversized uploads', async () => {
  await withServer(async base => {
    const unsupported = new FormData();
    unsupported.append('file', new Blob(['data'], { type: 'application/pdf' }), 'x.pdf');
    assert.equal((await fetch(`${base}/api/upload`, { method: 'POST', body: unsupported })).status, 415);

    const oversized = new FormData();
    oversized.append('file', new Blob(['x'.repeat(1024 * 1024 + 1)], { type: 'text/html' }), 'large.html');
    assert.equal((await fetch(`${base}/api/upload`, { method: 'POST', body: oversized })).status, 413);
  });
});

test('expires pages and supports deletion', async () => {
  await withServer(async base => {
    const form = new FormData();
    form.append('file', new Blob(['# Temporary'], { type: 'text/markdown' }), 'tmp.md');
    const upload = await fetch(`${base}/api/upload?ttl=1`, { method: 'POST', body: form });
    const result = await upload.json();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal((await fetch(result.url)).status, 410);

    const form2 = new FormData();
    form2.append('file', new Blob(['# Delete me'], { type: 'text/markdown' }), 'delete.md');
    const upload2 = await fetch(`${base}/api/upload`, { method: 'POST', body: form2 });
    const result2 = await upload2.json();
    assert.equal((await fetch(`${base}/api/pages/${result2.id}`, { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(result2.url)).status, 404);
  });
});
