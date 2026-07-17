import { error, json } from '@sveltejs/kit';
import { getSimilarVerses } from '$lib/server/dataApi';
import type { SimilarVersesMode } from '$lib/types';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const strongsCode = params.strongsCode;
	if (!strongsCode) error(400, 'Missing strongsCode');

	const mode: SimilarVersesMode = url.searchParams.get('mode') === 'exact' ? 'exact' : 'root';
	const text = url.searchParams.get('text') ?? '';

	const result = await getSimilarVerses(fetch, strongsCode, mode, text);

	// Short cache — see the chapter route's load function for why (the
	// backing data-api can correct/republish data, so a long fixed window
	// risks hiding a fix behind stale cached responses).
	return json(result, {
		headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' }
	});
};
