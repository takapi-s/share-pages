import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { marked } from 'marked';
import { PersistentPageStore } from './storage.js';

const MAX_BYTES = 1024 * 1024;
const ALLOWED_TYPES = new Set(['text/markdown', 'text/html']);

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch]);
}

function renderMarkdown(source) {
  return sanitizeHtml(marked.parse(source, { gfm: true, breaks: false, headerIds: false, mangle: false }));
}

function sanitizeHtml(source) {
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi, '');
}

export function parseMultipart(buffer, contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return null;
  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const rawParts = [];
  let start = 0;
  while (true) {
    const index = buffer.indexOf(boundary, start);
    if (index < 0) break;
    if (index > start) rawParts.push(buffer.subarray(start, index));
    start = index + boundary.length;
  }
  const parts = [];
  for (const raw of rawParts) {
    const part = raw.subarray(raw.indexOf('\r\n') === 0 ? 2 : 0);
    const separator = part.indexOf(Buffer.from('\r\n\r\n'));
    if (separator < 0) continue;
    const headers = part.subarray(0, separator).toString('utf8');
    let body = part.subarray(separator + 4);
    if (body.subarray(-2).toString() === '\r\n') body = body.subarray(0, -2);
    const disposition = headers.match(/content-disposition:.*?name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
    if (disposition) parts.push({ name: disposition[1], filename: disposition[2] || '', body, headers });
  }
  return parts.filter(part => part && part.name);
}

function uploadUi() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>共有ページ</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#222}#dropzone{border:2px dashed #999;border-radius:12px;padding:3rem 1rem;text-align:center;background:#fafafa;cursor:pointer}#dropzone.drag{border-color:#2563eb;background:#eff6ff}.item{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid #ddd;padding:.8rem 0}.meta{color:#666;font-size:.9rem}button{padding:.4rem .7rem}</style></head><body><h1>共有ページ</h1><p>Markdown / HTMLをドロップすると、一時共有URLを発行します。</p><div id="dropzone" class="dropzone">ここにファイルをドロップ<br>またはクリックして選択<input id="file" type="file" accept=".md,.markdown,.html,.htm,text/markdown,text/html" multiple hidden></div><p id="status" class="meta"></p><h2>発行済みページ</h2><section id="pages"><p class="meta">読み込み中…</p></section><script>
const zone=document.querySelector('#dropzone'), input=document.querySelector('#file'), status=document.querySelector('#status'), pages=document.querySelector('#pages');
zone.onclick=()=>input.click(); zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag')}; zone.ondragleave=()=>zone.classList.remove('drag'); zone.ondrop=e=>{e.preventDefault();zone.classList.remove('drag');upload(e.dataTransfer.files)}; input.onchange=()=>upload(input.files);
async function upload(files){for(const file of files){const type=file.type||(/\\.html?$/i.test(file.name)?'text/html':'text/markdown');if(!['text/html','text/markdown'].includes(type)){status.textContent=file.name+' はMarkdown/HTMLではありません';continue}const form=new FormData();form.append('file',file,file.name);const r=await fetch('/api/upload',{method:'POST',body:form});if(!r.ok){status.textContent=file.name+' のアップロードに失敗しました';continue}const x=await r.json();status.innerHTML='<a href="'+x.url+'" target="_blank">'+file.name+' の共有URLを開く</a>';await refresh()}}
async function refresh(){const r=await fetch('/api/pages');const xs=await r.json();pages.innerHTML=xs.length?xs.map(x=>'<div class="item"><span><a href="'+x.url+'" target="_blank">'+escapeHtml(x.originalName)+'</a><br><small class="meta">期限: '+new Date(x.expiresAt).toLocaleString()+'</small></span><button data-id="'+x.id+'">削除</button></div>').join(''):'<p class="meta">まだありません。</p>';pages.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await fetch('/api/pages/'+b.dataset.id,{method:'DELETE'});refresh()})}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))} refresh();
</script></body></html>`;
}

function pageShell(page, contentUrl, contentType) {
  const title = escapeHtml(page.originalName);
  const typeLabel = contentType === 'text/html' ? 'HTML' : 'Markdown';
  const description = `${typeLabel}共有ページ · 期限: ${new Date(page.expiresAt).toLocaleString('ja-JP')}`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta property="og:title" content="${title}"><meta property="og:description" content="${escapeHtml(description)}"><meta name="description" content="${escapeHtml(description)}"><style>:root{color-scheme:light}*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;color:#222}header{max-width:1100px;margin:0 auto;padding-left:1rem;padding-right:1rem}main{margin:0 auto;padding:2rem 1rem;line-height:1.7}header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:1rem;padding-bottom:1rem;border-bottom:1px solid #ddd}.brand{font-weight:700;color:inherit;text-decoration:none}.meta{color:#666;font-size:.9rem;margin:0}.tools{display:flex;align-items:center;gap:1rem}.download{color:inherit;white-space:nowrap}.content{width:100%}.markdown-content{max-width:1040px;margin:0 auto;padding:0 24px 2rem}.markdown-content h1,.markdown-content h2,.markdown-content h3,.markdown-content h4{line-height:1.3;margin:1.6em 0 .6em}.markdown-content h1{font-size:2rem}.markdown-content h2{font-size:1.5rem}.markdown-content h3{font-size:1.25rem}.markdown-content hr{border:0;border-top:1px solid #d9d9d9;margin:2rem 0}.markdown-content blockquote{margin:1.25rem 0;padding:.25rem 1rem;border-left:4px solid #bbb;color:#555;background:#fafafa}.markdown-content ul,.markdown-content ol{padding-left:1.6rem}.markdown-content li+li{margin-top:.35rem}.markdown-content pre{overflow:auto;padding:1rem;background:#f6f6f6;border-radius:6px}.markdown-content table{width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:.95em}.markdown-content th,.markdown-content td{border:1px solid #d9d9d9;padding:.6rem .75rem;text-align:left;vertical-align:top}.markdown-content th{background:#f6f6f6;font-weight:600}@media(max-width:600px){.markdown-content{padding-left:0;padding-right:0}}iframe{display:block;width:100%;min-height:calc(100vh - 120px);border:0}code{background:#f3f3f3;padding:.1em .3em;border-radius:4px}@media(max-width:600px){header{align-items:flex-start;flex-wrap:wrap}.tools{width:100%;justify-content:space-between}.content{padding-top:1.25rem}}</style></head><body><header><a class="brand" href="/">share-pages</a><div class="tools"><p class="meta">${escapeHtml(description)}</p><a class="download" href="/p/${page.id}/download">元ファイルをダウンロード</a></div></header><main class="content">${contentType === 'text/html' ? `<iframe sandbox="" src="${contentUrl}" title="${title}"></iframe>` : `<article class="markdown-content">${page.rendered}</article>`}</main></body></html>`;
}

export function createApp(options = {}) {
  const pages = options.store ?? (options.dataDir ? new PersistentPageStore(options.dataDir) : new Map());
  const ttlMs = options.ttlMs ?? 72 * 60 * 60 * 1000;
  const maxBytes = options.maxBytes ?? MAX_BYTES;

  function getPage(id) {
    const page = pages.get(id);
    if (!page) return null;
    if (Date.now() >= page.expiresAt) { pages.delete(id); return 'expired'; }
    return page;
  }

  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const send = (status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers }); res.end(body); };
    if (req.method === 'GET' && url.pathname === '/') { send(200, uploadUi(), { 'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'" }); return; }
    if (req.method === 'GET' && url.pathname === '/api/pages') {
      const origin = `${url.protocol}//${url.host}`;
      const result = [...pages.values()].map(page => ({ id: page.id, originalName: page.originalName, contentType: page.mime, url: `${origin}/p/${page.id}`, downloadUrl: `${origin}/p/${page.id}/download`, expiresAt: new Date(page.expiresAt).toISOString() })).filter(page => Date.parse(page.expiresAt) > Date.now()).sort((a, b) => Date.parse(b.expiresAt) - Date.parse(a.expiresAt));
      send(200, JSON.stringify(result), { 'content-type': 'application/json; charset=utf-8' }); return;
    }
    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const contentType = req.headers['content-type'] || '';
      const chunks = [];
      let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > maxBytes + 512 * 1024) { send(413, 'payload too large'); return; } chunks.push(chunk); }
      if (size > maxBytes + 512 * 1024) { send(413, 'payload too large'); return; }
      const parts = parseMultipart(Buffer.concat(chunks), contentType);
      const file = parts?.find(part => part.name === 'file');
      if (!file || !ALLOWED_TYPES.has((file.headers.match(/content-type:\s*([^\r\n]+)/i)?.[1] || '').trim().toLowerCase())) { send(415, 'only text/markdown and text/html are supported'); return; }
      if (file.body.length > maxBytes) { send(413, 'file too large'); return; }
      const mime = file.headers.match(/content-type:\s*([^\r\n]+)/i)[1].trim().toLowerCase();
      const id = randomBytes(12).toString('base64url');
      const ttlParam = url.searchParams.get('ttl');
      const ttl = ttlParam === null ? null : Number(ttlParam);
      const expiresAt = Date.now() + (ttl !== null && Number.isFinite(ttl) && ttl >= 0 ? ttl : ttlMs);
      const source = file.body.toString('utf8');
      const page = { id, originalName: file.filename || (mime === 'text/html' ? 'shared.html' : 'shared.md'), mime, source, rendered: mime === 'text/markdown' ? renderMarkdown(source) : sanitizeHtml(source), expiresAt };
      pages.set(id, page);
      const origin = `${url.protocol}//${url.host}`;
      send(201, JSON.stringify({ id, url: `${origin}/p/${id}`, downloadUrl: `${origin}/p/${id}/download`, expiresAt: new Date(expiresAt).toISOString(), contentType: mime }), { 'content-type': 'application/json; charset=utf-8' });
      return;
    }
    const pageMatch = url.pathname.match(/^\/p\/([A-Za-z0-9_-]+)(?:\/(content|download))?$/);
    if (pageMatch) {
      const page = getPage(pageMatch[1]);
      if (page === 'expired') { send(410, 'この共有ページの有効期限が切れています'); return; }
      if (!page) { send(404, '共有ページが見つかりません'); return; }
      if (pageMatch[2] === 'content') { send(200, page.rendered, { 'content-type': `${page.mime}; charset=utf-8`, 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:;" }); return; }
      if (pageMatch[2] === 'download') { send(200, page.source, { 'content-type': `${page.mime}; charset=utf-8`, 'content-disposition': `attachment; filename="${page.originalName.replace(/[^A-Za-z0-9._-]/g, '_')}"` }); return; }
      send(200, pageShell(page, `/p/${page.id}/content`, page.mime), { 'content-security-policy': "default-src 'self'; frame-src 'self'; style-src 'unsafe-inline';" });
      return;
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/pages/')) { const id = url.pathname.split('/').pop(); if (!pages.delete(id)) { send(404, 'not found'); return; } res.writeHead(204); res.end(); return; }
    send(404, 'not found');
  });
}
