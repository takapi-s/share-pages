import { createApp } from './app.js';

const port = Number(process.env.PORT || 8787);
const dataDir = process.env.SHARE_PAGES_DATA_DIR || new URL('../data', import.meta.url).pathname;
createApp({ dataDir }).listen(port, '127.0.0.1', () => {
  console.log(`share-pages listening on http://127.0.0.1:${port}`);
});
