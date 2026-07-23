import { json } from '@sveltejs/kit';
import { getHelloaoTranslations } from '$lib/server/helloao';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const translations = await getHelloaoTranslations(fetch);
	// The list itself changes rarely (new translations are added occasionally,
	// never removed/renamed) — a longer cache is fine here.
	return json(translations, {
		headers: { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' }
	});
};
