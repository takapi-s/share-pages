#!/usr/bin/env node

const endpoint = process.env.SHARE_PAGES_URL;
const token = process.env.SHARE_PAGES_TOKEN;
if (!endpoint) { console.error('SHARE_PAGES_URL is required'); process.exit(1); }

const authHeaders = () => token ? { authorization: `Bearer ${token}` } : {};
async function request(path, options = {}) {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = { text }; }
  if (!response.ok) throw new Error(`${response.status}: ${body.error || body.text || text}`);
  return body;
}
function writeReply(message) { process.stdout.write(`${JSON.stringify(message)}\n`); }
function reply(id, result) { writeReply({ jsonrpc: '2.0', id, result }); }
function failure(id, message) { writeReply({ jsonrpc: '2.0', id, error: { code: -32000, message } }); }

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  for (let index; (index = buffer.indexOf('\n')) >= 0;) {
    const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1); if (!line) continue;
    let message; try { message = JSON.parse(line); } catch { continue; }
    handle(message).catch(error => failure(message.id ?? null, error.message));
  }
});

async function handle(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') return reply(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'share-pages', version: '0.1.0' } });
  if (method === 'notifications/initialized') return;
  if (method === 'ping') return reply(id, {});
  if (method === 'tools/list') return reply(id, { tools: [
    { name: 'share_markdown', description: 'Markdown本文を72時間の一時共有ページとして公開します。', inputSchema: { type: 'object', required: ['filename', 'content'], properties: { filename: { type: 'string' }, content: { type: 'string' } } } },
    { name: 'share_html', description: 'HTML本文をsandbox表示する72時間の一時共有ページとして公開します。', inputSchema: { type: 'object', required: ['filename', 'content'], properties: { filename: { type: 'string' }, content: { type: 'string' } } } },
    { name: 'list_shared_pages', description: '発行済み共有ページを一覧します。', inputSchema: { type: 'object', properties: {} } },
    { name: 'delete_shared_page', description: '共有ページを削除します。', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } }
  ] });
  if (method !== 'tools/call') return id === undefined ? undefined : reply(id, {});
  const name = params.name; const args = params.arguments || {};
  if (name === 'list_shared_pages') return reply(id, { content: [{ type: 'text', text: JSON.stringify(await request('/api/pages'), null, 2) }] });
  if (name === 'delete_shared_page') { await request(`/api/pages/${encodeURIComponent(args.id)}`, { method: 'DELETE' }); return reply(id, { content: [{ type: 'text', text: `削除しました: ${args.id}` }] }); }
  if (name === 'share_markdown' || name === 'share_html') {
    const type = name === 'share_html' ? 'text/html' : 'text/markdown'; const form = new FormData(); form.append('file', new Blob([args.content || ''], { type }), args.filename || (name === 'share_html' ? 'shared.html' : 'shared.md'));
    const uploaded = await request('/api/upload', { method: 'POST', body: form }); return reply(id, { content: [{ type: 'text', text: JSON.stringify(uploaded) }] });
  }
  throw new Error(`unknown tool: ${name}`);
}
