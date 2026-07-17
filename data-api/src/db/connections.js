import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const DATA_DIR = process.env.DB_DATA_DIR ?? DEFAULT_DATA_DIR;

// Files in data/ that are not per-language gloss databases.
const NON_GLOSS_FILES = new Set(['hebrew_greek.db', 'eng_bsb.db', 'sdbh.db', 'sdbg.db', 'audio_timings.db']);

function open(filename) {
	return new Database(path.join(DATA_DIR, filename), { readonly: true, fileMustExist: true });
}

let hebrewGreekDb;
let translationDb;
let hebrewLexiconDb;
let greekLexiconDb;
const glossDbs = new Map();

export function getHebrewGreekDb() {
	return (hebrewGreekDb ??= open('hebrew_greek.db'));
}

export function getTranslationDb() {
	return (translationDb ??= open('eng_bsb.db'));
}

export function getLexiconDb(strongsCode) {
	if (strongsCode.startsWith('H')) {
		return (hebrewLexiconDb ??= open('sdbh.db'));
	}
	return (greekLexiconDb ??= open('sdbg.db'));
}

/** Returns the gloss database for a language code (e.g. "eng", "spa"), or
 *  null if data/<langCode>.db doesn't exist. */
export function getGlossDb(langCode) {
	if (glossDbs.has(langCode)) return glossDbs.get(langCode);

	const filePath = path.join(DATA_DIR, `${langCode}.db`);
	const db = fs.existsSync(filePath) ? open(`${langCode}.db`) : null;
	glossDbs.set(langCode, db);
	return db;
}

/** Language codes with a gloss database available in data/, e.g. from
 *  data-builder's build_all_gloss_dbs.py. */
export function listGlossLanguages() {
	return fs
		.readdirSync(DATA_DIR)
		.filter((name) => name.endsWith('.db') && !NON_GLOSS_FILES.has(name))
		.map((name) => name.replace(/\.db$/, ''))
		.sort();
}
