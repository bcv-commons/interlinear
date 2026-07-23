import { error } from '@sveltejs/kit';
import { getUsfmCode } from '$lib/bible-books';
import type { HelloaoContentBlock, HelloaoTranslation } from '$lib/types';

// Alternate Bible-translation text source for the second panel, entirely
// separate from data-api/shoresh: a public, keyless REST API covering ~1256
// translations across ~1004 languages. Fetched directly, plain text only —
// never touches the interlinear (Hebrew/Greek) panel or its word-click data.
const HELLOAO_BASE_URL = 'https://bible.helloao.org/api';

export async function getHelloaoTranslations(
	fetchFn: typeof fetch
): Promise<HelloaoTranslation[]> {
	const response = await fetchFn(`${HELLOAO_BASE_URL}/available_translations.json`);
	if (!response.ok) {
		error(response.status, `helloao.org request for available_translations.json failed`);
	}
	const data = await response.json();
	return data.translations.map(
		(t: {
			id: string;
			name: string;
			englishName: string;
			language: string;
			languageName: string;
			languageEnglishName: string;
			textDirection: string;
		}) => ({
			id: t.id,
			name: t.name,
			englishName: t.englishName,
			language: t.language,
			languageName: t.languageName,
			languageEnglishName: t.languageEnglishName,
			textDirection: t.textDirection === 'rtl' ? 'rtl' : 'ltr'
		})
	);
}

export async function getHelloaoChapter(
	fetchFn: typeof fetch,
	translationId: string,
	bookId: number,
	chapter: number
): Promise<HelloaoContentBlock[] | null> {
	const usfmCode = getUsfmCode(bookId);
	const response = await fetchFn(
		`${HELLOAO_BASE_URL}/${encodeURIComponent(translationId)}/${usfmCode}/${chapter}.json`
	);
	// Not every translation covers every book (NT-only translations, etc) —
	// treat "not found" as "unavailable in this translation", not an error.
	if (response.status === 404) return null;
	if (!response.ok) {
		error(response.status, `helloao.org request for ${translationId}/${usfmCode}/${chapter} failed`);
	}
	const data = await response.json();
	return data.chapter.content;
}
