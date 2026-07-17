import { error } from '@sveltejs/kit';
import {
	BIBLE_BOOKS,
	getBook,
	getNextChapter,
	getPreviousChapter,
	isValidBookChapter
} from '$lib/bible-books';
import { getChapterData } from '$lib/server/dataApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders, fetch }) => {
	const bookId = Number(params.book);
	const chapter = Number(params.chapter);

	if (
		!Number.isInteger(bookId) ||
		!Number.isInteger(chapter) ||
		!isValidBookChapter(bookId, chapter)
	) {
		error(404, 'Chapter not found');
	}

	const book = getBook(bookId)!;

	// A given chapter's Hebrew/Greek + translation text never changes at
	// runtime, so this is safe to cache aggressively (at the CDN and browser).
	setHeaders({ 'cache-control': 'public, max-age=604800, immutable' });

	const { hebrewGreekWords, translationLines } = await getChapterData(fetch, bookId, chapter);

	return {
		book,
		chapter,
		books: BIBLE_BOOKS,
		previous: getPreviousChapter(bookId, chapter),
		next: getNextChapter(bookId, chapter),
		hebrewGreekWords,
		translationLines
	};
};
