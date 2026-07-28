import { error } from '@sveltejs/kit';
import { getUsfmCode } from '$lib/bible-books';
import type { HelloaoContentBlock, HelloaoTranslation } from '$lib/types';
import { segmentForDisplay } from './alignment';

// Alternate Bible-translation text source for the second panel, entirely
// separate from data-api/shoresh: a public, keyless REST API covering ~1256
// translations across ~1004 languages. Fetched directly, plain text only —
// never touches the interlinear (Hebrew/Greek) panel or its word-click data.
const HELLOAO_BASE_URL = 'https://bible.helloao.org/api';

export async function getHelloaoTranslations(fetchFn: typeof fetch): Promise<HelloaoTranslation[]> {
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
		error(
			response.status,
			`helloao.org request for ${translationId}/${usfmCode}/${chapter} failed`
		);
	}
	// A missing/invalid translation id doesn't 404 here — helloao.org falls
	// back to serving its own docs site (200, text/html) instead. Verified
	// live against a sample of translation ids known to be unreachable
	// (bcv-commons/bibles' catalog-overlap.json `r: false` entries): all
	// returned HTTP 200 with an HTML docs page, not JSON. Treat that the
	// same as a 404 (unavailable) rather than letting `.json()` throw.
	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('json')) return null;
	const data = await response.json();
	const rawBlocks: {
		type: string;
		content?: (string | { noteId: number })[];
		number?: number;
	}[] = data.chapter.content;

	return rawBlocks.map((block): HelloaoContentBlock => {
		if (block.type === 'heading') return { type: 'heading', content: block.content as string[] };
		if (block.type === 'line_break') return { type: 'line_break' };
		// Footnote markers are dropped, matching the note-stripping behavior
		// already applied to the default (data-api/shoresh) translation panel.
		const text = (block.content ?? []).filter((part) => typeof part === 'string').join(' ');
		// Every run of the text — not just the alignable letter/mark runs —
		// so punctuation, digits, and whitespace still render; only the
		// letter/mark segments are ever alignment targets (see alignment.ts).
		return {
			type: 'verse',
			number: block.number!,
			tokens: segmentForDisplay(text).map((t) => ({ text: t, wordIds: null }))
		};
	});
}
