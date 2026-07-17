import { getGlossDb } from './connections.js';

/** Ported from GlossDatabase.getGloss in
 *  example/study-app/lib/services/gloss/gloss_database.dart. Returns null
 *  if langCode has no gloss database in data/, or that word id has no
 *  gloss recorded for it. */
export function getGloss(langCode, wordId) {
	const db = getGlossDb(langCode);
	if (db === null) return null;

	const row = db
		.prepare(
			`SELECT t.text AS text
			 FROM verses v
			 JOIN text t ON v.text = t._id
			 WHERE v._id = ?`
		)
		.get(wordId);
	return row?.text ?? null;
}
