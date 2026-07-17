#!/usr/bin/env node
// One-time (idempotent) maintenance script: adds indexes to hebrew_greek.db
// that the upstream Flutter app's database_builder schema doesn't ship with.
//
// Without idx_verses_strongs, "similar verses" root-mode search
// (allWordsForStrongsCode) does a full table scan of `verses` (448k rows)
// on every lookup — ~70ms regardless of how common the Strong's code is.
// Without idx_verses_text, "similar verses" exact-match mode
// (searchExactMatchNoPunctuation) has the same problem in the other
// join direction (text -> verses instead of strongs -> verses).
//
// Safe to re-run: CREATE INDEX IF NOT EXISTS is a no-op if already applied.
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const db = new Database(path.join(dataDir, 'hebrew_greek.db'));

db.exec(`
	CREATE INDEX IF NOT EXISTS idx_verses_strongs ON verses (strongs);
	CREATE INDEX IF NOT EXISTS idx_strongs_code ON strongs (code);
	CREATE INDEX IF NOT EXISTS idx_verses_text ON verses (text);
`);

console.log('Indexes ensured on hebrew_greek.db:');
for (const row of db.pragma('index_list(verses)')) {
	console.log(' verses:', row.name);
}
for (const row of db.pragma('index_list(strongs)')) {
	console.log(' strongs:', row.name);
}

db.close();
