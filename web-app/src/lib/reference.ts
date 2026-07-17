/**
 * Word/verse id unpacking, ported from example/study-app/lib/common/word.dart.
 * Used client-side to group interlinear words and translation lines by
 * verse number for display. The corresponding *packing* logic (chapter
 * bounds for SQL queries) now lives server-side in data-api.
 *
 * Hebrew/Greek word ids are packed as BBCCCVVVWW (book, chapter, verse, word-in-verse).
 * Bible translation ids are packed as BCCCVVV (book, chapter, verse).
 */

export interface Reference {
	bookId: number;
	chapter: number;
	verse: number;
}

export function extractReferenceFromWordId(wordId: number): Reference {
	const verse = Math.floor(wordId / 100) % 1000;
	const chapter = Math.floor(wordId / 100_000) % 1000;
	const bookId = Math.floor(wordId / 100_000_000);
	return { bookId, chapter, verse };
}

export function extractReferenceFromVerseId(id: number): Reference {
	const bookId = Math.floor(id / 1_000_000);
	const remainder = id % 1_000_000;
	const chapter = Math.floor(remainder / 1_000);
	const verse = remainder % 1_000;
	return { bookId, chapter, verse };
}
