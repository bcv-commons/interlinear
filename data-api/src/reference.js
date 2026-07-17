/**
 * Word/verse id packing, ported from example/study-app/lib/common/word.dart
 * and lib/services/hebrew_greek/database.dart. Kept in sync with the
 * identical module in web-app/src/lib/reference.ts (duplicated rather than
 * shared so the two services can be deployed independently).
 *
 * Hebrew/Greek word ids are packed as BBCCCVVVWW (book, chapter, verse, word-in-verse).
 * Bible translation + verse-search ids are packed as BCCCVVV (book, chapter, verse).
 */

const WORD_ID_BOOK_MULTIPLIER = 100_000_000;
const WORD_ID_CHAPTER_MULTIPLIER = 100_000;

const WORD_ID_VERSE_MULTIPLIER = 100;

export function wordIdChapterBounds(bookId, chapter) {
	const lower = bookId * WORD_ID_BOOK_MULTIPLIER + chapter * WORD_ID_CHAPTER_MULTIPLIER;
	const upper = bookId * WORD_ID_BOOK_MULTIPLIER + (chapter + 1) * WORD_ID_CHAPTER_MULTIPLIER;
	return [lower, upper];
}

export function wordIdVerseBounds(bookId, chapter, verse) {
	const lower =
		bookId * WORD_ID_BOOK_MULTIPLIER +
		chapter * WORD_ID_CHAPTER_MULTIPLIER +
		verse * WORD_ID_VERSE_MULTIPLIER;
	const upper = lower + WORD_ID_VERSE_MULTIPLIER;
	return [lower, upper];
}

const VERSE_ID_BOOK_MULTIPLIER = 1_000_000;
const VERSE_ID_CHAPTER_MULTIPLIER = 1_000;

export function verseIdChapterBounds(bookId, chapter) {
	const lower = bookId * VERSE_ID_BOOK_MULTIPLIER + chapter * VERSE_ID_CHAPTER_MULTIPLIER;
	const upper = bookId * VERSE_ID_BOOK_MULTIPLIER + (chapter + 1) * VERSE_ID_CHAPTER_MULTIPLIER;
	return [lower, upper];
}

export function extractReferenceFromVerseId(id) {
	const bookId = Math.floor(id / VERSE_ID_BOOK_MULTIPLIER);
	const remainder = id % VERSE_ID_BOOK_MULTIPLIER;
	const chapter = Math.floor(remainder / VERSE_ID_CHAPTER_MULTIPLIER);
	const verse = remainder % VERSE_ID_CHAPTER_MULTIPLIER;
	return { bookId, chapter, verse };
}
