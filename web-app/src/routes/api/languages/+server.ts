import { json } from '@sveltejs/kit';
import { getGlossLanguages } from '$lib/server/dataApi';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const languages = await getGlossLanguages(fetch);
	return json(languages, {
		headers: { 'cache-control': 'public, max-age=3600' }
	});
};
