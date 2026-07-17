import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getUsfmCode } from '$lib/bible-books';
import type {
	HebrewGreekWord,
	TranslationLine,
	WordDetails,
	SimilarVersesMode,
	SimilarVersesResult
} from '$lib/types';

// Base URL of the standalone gbt-data-api service (see /data-api at the repo
// root). Defaults to a local instance so `pnpm dev` works out of the box
// when data-api is also running locally on its default port.
const DATA_API_URL = env.DATA_API_URL ?? 'http://localhost:3000';
const DATA_API_KEY = env.DATA_API_KEY;

async function get(fetchFn: typeof fetch, path: string) {
	const response = await fetchFn(`${DATA_API_URL}${path}`, {
		headers: DATA_API_KEY ? { 'x-api-key': DATA_API_KEY } : undefined
	});
	if (!response.ok) {
		error(response.status, `data-api request to ${path} failed: ${response.statusText}`);
	}
	return response;
}

export async function getChapterData(
	fetchFn: typeof fetch,
	bookId: number,
	chapter: number
): Promise<{ hebrewGreekWords: HebrewGreekWord[]; translationLines: TranslationLine[] }> {
	// The deployed data-api keys /chapter by the 3-letter USFM code (e.g.
	// "GEN"), not the numeric book id used everywhere else in this app —
	// translate only at this one call site so routes/UI/bible-books.ts
	// stay numeric-id-based throughout.
	const response = await get(fetchFn, `/chapter/${getUsfmCode(bookId)}/${chapter}`);
	return response.json();
}

export async function getWordDetails(
	fetchFn: typeof fetch,
	wordId: number,
	langCode: string
): Promise<WordDetails> {
	const response = await get(fetchFn, `/word/${wordId}?lang=${encodeURIComponent(langCode)}`);
	return response.json();
}

export async function getSimilarVerses(
	fetchFn: typeof fetch,
	strongsCode: string,
	mode: SimilarVersesMode,
	text: string
): Promise<SimilarVersesResult> {
	const params = new URLSearchParams({ mode, text });
	const response = await get(fetchFn, `/similar/${encodeURIComponent(strongsCode)}?${params}`);
	return response.json();
}

export async function getGlossLanguages(
	fetchFn: typeof fetch
): Promise<{ code: string; name: string }[]> {
	const response = await get(fetchFn, `/languages`);
	const data = await response.json();
	return data.languages;
}
