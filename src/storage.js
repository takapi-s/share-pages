import fs from 'node:fs';
import path from 'node:path';

export class PersistentPageStore {
  constructor(directory) {
    this.directory = directory;
    this.file = path.join(directory, 'pages.json');
    fs.mkdirSync(directory, { recursive: true });
    this.pages = new Map();
    if (fs.existsSync(this.file)) {
      try {
        const values = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        for (const page of values) this.pages.set(page.id, page);
      } catch {
        // A corrupt local cache must not prevent the service from starting.
        this.pages = new Map();
      }
    }
  }

  get(id) { return this.pages.get(id); }
  values() { return this.pages.values(); }
  set(id, page) { this.pages.set(id, page); this.flush(); return this; }
  delete(id) { const deleted = this.pages.delete(id); if (deleted) this.flush(); return deleted; }
  pruneExpired(now = Date.now()) {
    let changed = false;
    for (const [id, page] of this.pages) {
      if (now >= page.expiresAt) { this.pages.delete(id); changed = true; }
    }
    if (changed) this.flush();
    return changed;
  }
  flush() {
    const temporary = `${this.file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify([...this.pages.values()], null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.file);
  }
}
