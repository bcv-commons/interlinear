import { json } from '@sveltejs/kit';
import { getHelloaoTranslations } from '$lib/server/helloao';
import { getUnreachableHelloaoIds } from '$lib/server/catalogOverlap';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const [translations, unreachableIds] = await Promise.all([
		getHelloaoTranslations(fetch),
		getUnreachableHelloaoIds(fetch)
	]);
	// Filter out translations bcv-commons/bibles' catalog-overlap.json has
	// verified unreachable — see catalogOverlap.ts for why a plain fetch
	// can't detect this itself (helloao.org returns 200/HTML, not 404, for
	// a missing translation id).
	const available = translations.filter((t) => !unreachableIds.has(t.id));

	// The list itself changes rarely (new translations are added occasionally,
	// never removed/renamed) — a longer cache is fine here.
	return json(available, {
		headers: { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' }
	});
};
