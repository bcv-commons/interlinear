import { error, json } from '@sveltejs/kit';
import { getHelloaoChapter } from '$lib/server/helloao';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const bookId = Number(params.book);
	const chapter = Number(params.chapter);
	if (!Number.isInteger(bookId) || !Number.isInteger(chapter)) {
		error(400, 'Invalid book/chapter');
	}

	const content = await getHelloaoChapter(fetch, params.translationId, bookId, chapter);

	return json(
		{ content },
		{ headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } }
	);
};
