import { error, json } from '@sveltejs/kit';
import { getWordDetails } from '$lib/server/dataApi';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const wordId = Number(params.wordId);
	if (!Number.isInteger(wordId)) error(400, 'Invalid word id');
	const langCode = url.searchParams.get('lang') ?? 'eng';

	const details = await getWordDetails(fetch, wordId, langCode);

	// A given word id's text/grammar/gloss/lexicon entries never change at
	// runtime, so this is safe to cache aggressively.
	return json(details, {
		headers: { 'cache-control': 'public, max-age=604800, immutable' }
	});
};
