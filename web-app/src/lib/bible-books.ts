export interface BibleBook {
	id: number;
	name: string;
	chapters: number;
	/** Hebrew Old Testament books render right-to-left; Greek New Testament books render left-to-right. */
	testament: 'ot' | 'nt';
}

// Book id, English name, and chapter count, ported from
// example/study-app/lib/common/book_name.dart and bible_navigation.dart.
export const BIBLE_BOOKS: BibleBook[] = [
	{ id: 1, name: 'Genesis', chapters: 50, testament: 'ot' },
	{ id: 2, name: 'Exodus', chapters: 40, testament: 'ot' },
	{ id: 3, name: 'Leviticus', chapters: 27, testament: 'ot' },
	{ id: 4, name: 'Numbers', chapters: 36, testament: 'ot' },
	{ id: 5, name: 'Deuteronomy', chapters: 34, testament: 'ot' },
	{ id: 6, name: 'Joshua', chapters: 24, testament: 'ot' },
	{ id: 7, name: 'Judges', chapters: 21, testament: 'ot' },
	{ id: 8, name: 'Ruth', chapters: 4, testament: 'ot' },
	{ id: 9, name: '1 Samuel', chapters: 31, testament: 'ot' },
	{ id: 10, name: '2 Samuel', chapters: 24, testament: 'ot' },
	{ id: 11, name: '1 Kings', chapters: 22, testament: 'ot' },
	{ id: 12, name: '2 Kings', chapters: 25, testament: 'ot' },
	{ id: 13, name: '1 Chronicles', chapters: 29, testament: 'ot' },
	{ id: 14, name: '2 Chronicles', chapters: 36, testament: 'ot' },
	{ id: 15, name: 'Ezra', chapters: 10, testament: 'ot' },
	{ id: 16, name: 'Nehemiah', chapters: 13, testament: 'ot' },
	{ id: 17, name: 'Esther', chapters: 10, testament: 'ot' },
	{ id: 18, name: 'Job', chapters: 42, testament: 'ot' },
	{ id: 19, name: 'Psalms', chapters: 150, testament: 'ot' },
	{ id: 20, name: 'Proverbs', chapters: 31, testament: 'ot' },
	{ id: 21, name: 'Ecclesiastes', chapters: 12, testament: 'ot' },
	{ id: 22, name: 'Song of Solomon', chapters: 8, testament: 'ot' },
	{ id: 23, name: 'Isaiah', chapters: 66, testament: 'ot' },
	{ id: 24, name: 'Jeremiah', chapters: 52, testament: 'ot' },
	{ id: 25, name: 'Lamentations', chapters: 5, testament: 'ot' },
	{ id: 26, name: 'Ezekiel', chapters: 48, testament: 'ot' },
	{ id: 27, name: 'Daniel', chapters: 12, testament: 'ot' },
	{ id: 28, name: 'Hosea', chapters: 14, testament: 'ot' },
	{ id: 29, name: 'Joel', chapters: 3, testament: 'ot' },
	{ id: 30, name: 'Amos', chapters: 9, testament: 'ot' },
	{ id: 31, name: 'Obadiah', chapters: 1, testament: 'ot' },
	{ id: 32, name: 'Jonah', chapters: 4, testament: 'ot' },
	{ id: 33, name: 'Micah', chapters: 7, testament: 'ot' },
	{ id: 34, name: 'Nahum', chapters: 3, testament: 'ot' },
	{ id: 35, name: 'Habakkuk', chapters: 3, testament: 'ot' },
	{ id: 36, name: 'Zephaniah', chapters: 3, testament: 'ot' },
	{ id: 37, name: 'Haggai', chapters: 2, testament: 'ot' },
	{ id: 38, name: 'Zechariah', chapters: 14, testament: 'ot' },
	{ id: 39, name: 'Malachi', chapters: 4, testament: 'ot' },
	{ id: 40, name: 'Matthew', chapters: 28, testament: 'nt' },
	{ id: 41, name: 'Mark', chapters: 16, testament: 'nt' },
	{ id: 42, name: 'Luke', chapters: 24, testament: 'nt' },
	{ id: 43, name: 'John', chapters: 21, testament: 'nt' },
	{ id: 44, name: 'Acts', chapters: 28, testament: 'nt' },
	{ id: 45, name: 'Romans', chapters: 16, testament: 'nt' },
	{ id: 46, name: '1 Corinthians', chapters: 16, testament: 'nt' },
	{ id: 47, name: '2 Corinthians', chapters: 13, testament: 'nt' },
	{ id: 48, name: 'Galatians', chapters: 6, testament: 'nt' },
	{ id: 49, name: 'Ephesians', chapters: 6, testament: 'nt' },
	{ id: 50, name: 'Philippians', chapters: 4, testament: 'nt' },
	{ id: 51, name: 'Colossians', chapters: 4, testament: 'nt' },
	{ id: 52, name: '1 Thessalonians', chapters: 5, testament: 'nt' },
	{ id: 53, name: '2 Thessalonians', chapters: 3, testament: 'nt' },
	{ id: 54, name: '1 Timothy', chapters: 6, testament: 'nt' },
	{ id: 55, name: '2 Timothy', chapters: 4, testament: 'nt' },
	{ id: 56, name: 'Titus', chapters: 3, testament: 'nt' },
	{ id: 57, name: 'Philemon', chapters: 1, testament: 'nt' },
	{ id: 58, name: 'Hebrews', chapters: 13, testament: 'nt' },
	{ id: 59, name: 'James', chapters: 5, testament: 'nt' },
	{ id: 60, name: '1 Peter', chapters: 5, testament: 'nt' },
	{ id: 61, name: '2 Peter', chapters: 3, testament: 'nt' },
	{ id: 62, name: '1 John', chapters: 5, testament: 'nt' },
	{ id: 63, name: '2 John', chapters: 1, testament: 'nt' },
	{ id: 64, name: '3 John', chapters: 1, testament: 'nt' },
	{ id: 65, name: 'Jude', chapters: 1, testament: 'nt' },
	{ id: 66, name: 'Revelation', chapters: 22, testament: 'nt' }
];

const BOOKS_BY_ID = new Map(BIBLE_BOOKS.map((book) => [book.id, book]));

export function getBook(bookId: number): BibleBook | undefined {
	return BOOKS_BY_ID.get(bookId);
}

export function isValidBookChapter(bookId: number, chapter: number): boolean {
	const book = getBook(bookId);
	return book !== undefined && chapter >= 1 && chapter <= book.chapters;
}

export function getPreviousChapter(
	bookId: number,
	chapter: number
): { bookId: number; chapter: number } | null {
	if (chapter > 1) return { bookId, chapter: chapter - 1 };
	if (bookId > 1) {
		const previousBook = getBook(bookId - 1)!;
		return { bookId: previousBook.id, chapter: previousBook.chapters };
	}
	return null;
}

export function getNextChapter(
	bookId: number,
	chapter: number
): { bookId: number; chapter: number } | null {
	const book = getBook(bookId)!;
	if (chapter < book.chapters) return { bookId, chapter: chapter + 1 };
	if (bookId < BIBLE_BOOKS.length) return { bookId: bookId + 1, chapter: 1 };
	return null;
}
