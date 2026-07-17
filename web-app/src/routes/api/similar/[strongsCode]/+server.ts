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

	return json(result, {
		headers: { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' }
	});
};
