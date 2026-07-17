import { error, json } from '@sveltejs/kit';
import { getWordDetails } from '$lib/server/dataApi';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const wordId = Number(params.wordId);
	if (!Number.isInteger(wordId)) error(400, 'Invalid word id');
	const langCode = url.searchParams.get('lang') ?? 'eng';

	const details = await getWordDetails(fetch, wordId, langCode);

	// Short cache, not `immutable` — see the chapter route's load function
	// for why: the backing data-api is a third-party service that can
	// correct/republish data, and `immutable` would hide fixes from
	// anyone with a cached copy for the full max-age.
	return json(details, {
		headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' }
	});
};
