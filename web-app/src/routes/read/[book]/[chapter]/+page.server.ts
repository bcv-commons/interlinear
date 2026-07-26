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

	// Cache, but not with `immutable` and not for a long fixed window — a
	// given chapter's text is *usually* stable, but it's served by a
	// third-party data-api that can and does correct/republish data (e.g.
	// a translation-source fix). `immutable` tells browsers to never
	// revalidate for the full max-age, so a bug fix upstream wouldn't
	// reach anyone with a cached copy for up to that long. A short
	// max-age + stale-while-revalidate still avoids most repeat-view
	// round-trips while keeping fixes visible within the hour.
	setHeaders({ 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' });

	// translationLines (the data-api/shoresh-sourced default translation) is
	// intentionally unused now — the target-language pane is always the
	// alignment-capable helloao panel (ChapterReader.svelte), which fetches
	// its own text client-side.
	const { hebrewGreekWords } = await getChapterData(fetch, bookId, chapter);

	return {
		book,
		chapter,
		books: BIBLE_BOOKS,
		previous: getPreviousChapter(bookId, chapter),
		next: getNextChapter(bookId, chapter),
		hebrewGreekWords
	};
};
