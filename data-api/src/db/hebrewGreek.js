import { getHebrewGreekDb } from './connections.js';
import { wordIdChapterBounds, wordIdVerseBounds } from '../reference.js';
import { removePunctuation } from '../normalization.js';

/** Ported from HebrewGreekDatabase.getChapter in
 *  example/study-app/lib/services/hebrew_greek/database.dart, with the
 *  Strong's code joined in as well (needed to render/click each word). */
export function getChapter(bookId, chapter) {
	const [lower, upper] = wordIdChapterBounds(bookId, chapter);
	return getHebrewGreekDb()
		.prepare(
			`SELECT v._id AS id, t.text AS text, l.code AS strongsCode
			 FROM verses v
			 JOIN text t ON v.text = t._id
			 JOIN strongs l ON v.strongs = l._id
			 WHERE v._id >= ? AND v._id < ?
			 ORDER BY v._id ASC`
		)
		.all(lower, upper);
}

export function getWordForId(wordId) {
	const row = getHebrewGreekDb()
		.prepare(
			`SELECT t.text AS text
			 FROM verses v
			 JOIN text t ON v.text = t._id
			 WHERE v._id = ?`
		)
		.get(wordId);
	return row?.text ?? null;
}

export function getStrongsAndGrammar(wordId) {
	const row = getHebrewGreekDb()
		.prepare(
			`SELECT l.code AS strongsCode, g.grammar AS grammar
			 FROM verses v
			 JOIN strongs l ON v.strongs = l._id
			 JOIN grammar g ON v.grammar = g._id
			 WHERE v._id = ?`
		)
		.get(wordId);
	return row ?? null;
}

/** Distinct BCCCVVV verse ids (see reference.js) containing the given
 *  Strong's code, deduplicated and capped in SQL rather than in JS — a
 *  common word like the Greek article (G3588) occurs 20k+ times, and
 *  without a LIMIT here every one of those rows would need to be pulled
 *  across the wire before being discarded down to `limit`. Requires
 *  idx_verses_strongs (see scripts/optimize-hebrew-greek-db.js); without
 *  it this query is a full table scan regardless of `code`'s frequency. */
export function getVerseIdsForStrongsCode(strongsCode, limit) {
	const rows = getHebrewGreekDb()
		.prepare(
			`SELECT DISTINCT (v._id / 100) AS verseId
			 FROM verses v
			 JOIN strongs l ON v.strongs = l._id
			 WHERE l.code = ?
			 ORDER BY verseId ASC
			 LIMIT ?`
		)
		.all(strongsCode, limit);
	return rows.map((row) => row.verseId);
}

export function countVersesForStrongsCode(strongsCode) {
	const row = getHebrewGreekDb()
		.prepare(
			`SELECT COUNT(DISTINCT (v._id / 100)) AS total
			 FROM verses v
			 JOIN strongs l ON v.strongs = l._id
			 WHERE l.code = ?`
		)
		.get(strongsCode);
	return row.total;
}

export function strongsCodeRoot(strongsCode) {
	const row = getHebrewGreekDb().prepare(`SELECT root FROM strongs WHERE code = ? LIMIT 1`).get(strongsCode);
	return row?.root ?? null;
}

/** All words (with Strong's code) for a single verse, in order — used to
 *  render a "similar verses" result with the matching word highlighted in
 *  context, mirroring SimilarVerseManager.getVerseContent in
 *  example/study-app/lib/ui/home/word_details_dialog/similar_verses/similar_verse_manager.dart. */
export function getWordsForVerse(bookId, chapter, verse) {
	const [lower, upper] = wordIdVerseBounds(bookId, chapter, verse);
	return getHebrewGreekDb()
		.prepare(
			`SELECT v._id AS id, t.text AS text, l.code AS strongsCode
			 FROM verses v
			 JOIN text t ON v.text = t._id
			 JOIN strongs l ON v.strongs = l._id
			 WHERE v._id >= ? AND v._id < ?
			 ORDER BY v._id ASC`
		)
		.all(lower, upper);
}

/** Distinct BCCCVVV verse ids containing a word whose text exactly matches
 *  `text` (ignoring punctuation/case), deduplicated and capped in SQL —
 *  same reasoning as getVerseIdsForStrongsCode. Requires idx_verses_text
 *  (see scripts/optimize-hebrew-greek-db.js) for the text->verses join
 *  direction; without it this is a full table scan regardless of how
 *  common the word is. Ported from
 *  HebrewGreekDatabase.searchExactMatchNoPunctuation. */
export function getVerseIdsForExactText(text, limit) {
	const normalized = removePunctuation(text);
	const rows = getHebrewGreekDb()
		.prepare(
			`SELECT DISTINCT (v._id / 100) AS verseId
			 FROM verses v
			 JOIN text t ON v.text = t._id
			 WHERE t.no_punctuation = ?
			 ORDER BY verseId ASC
			 LIMIT ?`
		)
		.all(normalized, limit);
	return rows.map((row) => row.verseId);
}

export function countVersesForExactText(text) {
	const normalized = removePunctuation(text);
	const row = getHebrewGreekDb()
		.prepare(
			`SELECT COUNT(DISTINCT (v._id / 100)) AS total
			 FROM verses v
			 JOIN text t ON v.text = t._id
			 WHERE t.no_punctuation = ?`
		)
		.get(normalized);
	return row.total;
}
