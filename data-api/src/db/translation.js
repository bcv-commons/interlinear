import { getTranslationDb } from './connections.js';
import { verseIdChapterBounds } from '../reference.js';

/** Ported from LocalizedBibleDatabase.getChapter in
 *  example/study-app/lib/services/bible/localized_bible_database.dart.
 *  Only the bundled English Berean Standard Bible (eng_bsb.db) is wired up
 *  for this web port. */
export function getTranslationChapter(bookId, chapter) {
	const [lower, upper] = verseIdChapterBounds(bookId, chapter);
	return getTranslationDb()
		.prepare(
			`SELECT reference, text, format
			 FROM bible
			 WHERE reference >= ? AND reference < ?
			 ORDER BY _id ASC`
		)
		.all(lower, upper);
}
