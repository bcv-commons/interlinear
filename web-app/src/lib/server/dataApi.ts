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

// The contract (data-api/API_CONTRACT.md) specifies /chapter/:book/:chapter
// keyed by the numeric book id, which the bundled data-api implements
// literally. One production backend (shoresh) deviates and keys it by
// 3-letter USFM code instead. Rather than requiring an env var to tell
// these apart (easy to forget, and a mismatch 400s on *every* chapter
// load), auto-detect it — remembering which style worked for the rest of
// this server process so later requests don't pay the extra round-trip.
// Try USFM first: production (Netlify, pointed at shoresh) is both the
// higher-traffic deployment and the one least likely to benefit from the
// in-process cache (serverless functions cold-start often), so it should
// never eat a wasted failing call; local dev against the bundled data-api
// (numeric) is a single long-lived process, so its one-time fallback probe
// is comparatively free.
let bookIdStyle: 'numeric' | 'usfm' | undefined;

export async function getChapterData(
	fetchFn: typeof fetch,
	bookId: number,
	chapter: number
): Promise<{ hebrewGreekWords: HebrewGreekWord[]; translationLines: TranslationLine[] }> {
	if (bookIdStyle === undefined) {
		const usfmResponse = await fetchChapter(fetchFn, getUsfmCode(bookId), chapter);
		if (usfmResponse.ok) {
			bookIdStyle = 'usfm';
			return usfmResponse.json();
		}
		const numericResponse = await fetchChapter(fetchFn, bookId, chapter);
		if (!numericResponse.ok) {
			error(
				numericResponse.status,
				`data-api request to /chapter failed: ${numericResponse.statusText}`
			);
		}
		bookIdStyle = 'numeric';
		return numericResponse.json();
	}

	const bookParam = bookIdStyle === 'usfm' ? getUsfmCode(bookId) : bookId;
	const response = await get(fetchFn, `/chapter/${bookParam}/${chapter}`);
	return response.json();
}

function fetchChapter(fetchFn: typeof fetch, bookParam: string | number, chapter: number) {
	return fetchFn(`${DATA_API_URL}/chapter/${bookParam}/${chapter}`, {
		headers: DATA_API_KEY ? { 'x-api-key': DATA_API_KEY } : undefined
	});
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
