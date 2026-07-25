import { getBook } from '$lib/bible-books';

// Client for bcv-commons/compact-alignments (Hugging Face) — word-level
// alignments between a Bible translation's own tokens and the original
// Hebrew/Greek, keyed by lexeme (a language+augmented-Strong's id), not by
// morphology. Entirely generic: works for any of the ~200 languages this
// dataset covers, not just one — nothing here is per-language special-cased.
const HF_BASE_URL = 'https://huggingface.co/datasets/bcv-commons/compact-alignments/resolve/main';
const HF_TREE_BASE_URL =
	'https://huggingface.co/api/datasets/bcv-commons/compact-alignments/tree/main';

/**
 * The published edition folder name for a given (iso, translationId) pair —
 * "iso-prefixed unless it already carries one" (docs/compact-alignments.md,
 * `edition_id()`). E.g. iso=eng, translationId=BSB -> "eng_BSB"; iso=ind,
 * translationId=ind_ayt -> "ind_ayt" (already carries the prefix).
 */
export function deriveEditionFolder(iso: string, translationId: string): string {
	return translationId.startsWith(`${iso}_`) ? translationId : `${iso}_${translationId}`;
}

// bookCode -> exact published filename (content-hash suffix included),
// cached per (iso, edition) for the life of this server process — this
// dataset is append-only/content-addressed, so a filename never goes stale
// once observed.
const editionFileIndexCache = new Map<string, Map<string, string> | null>();

async function getEditionFileIndex(
	fetchFn: typeof fetch,
	iso: string,
	edition: string
): Promise<Map<string, string> | null> {
	const cacheKey = `${iso}/${edition}`;
	const cached = editionFileIndexCache.get(cacheKey);
	if (cached !== undefined) return cached;

	const path = `${iso[0]}/${iso}/${edition}`;
	const response = await fetchFn(`${HF_TREE_BASE_URL}/${path}`);
	if (!response.ok) {
		editionFileIndexCache.set(cacheKey, null);
		return null;
	}
	const entries: { type: string; path: string }[] = await response.json();
	const index = new Map<string, string>();
	for (const entry of entries) {
		if (entry.type !== 'file') continue;
		const filename = entry.path.split('/').pop()!;
		const bookCode = filename.split('_')[0];
		index.set(bookCode, filename);
	}
	editionFileIndexCache.set(cacheKey, index);
	return index;
}

// verse ref ("BOOK C:V") -> ordered lexeme-number array, one per content
// lexeme in that verse. Published ONCE per book and shared by every
// language/edition that aligns to it (see docs/compact-alignments.md) — so
// this cache is keyed by book only, never by language.
const bookLexemesCache = new Map<string, Record<string, string[]> | null>();

async function getBookLexemes(
	fetchFn: typeof fetch,
	bookCode: string
): Promise<Record<string, string[]> | null> {
	const cached = bookLexemesCache.get(bookCode);
	if (cached !== undefined) return cached;

	const response = await fetchFn(`${HF_BASE_URL}/_index/${bookCode}_lexemes.json`);
	if (!response.ok) {
		bookLexemesCache.set(bookCode, null);
		return null;
	}
	const data = await response.json();
	bookLexemesCache.set(bookCode, data);
	return data;
}

// (iso, edition, bookCode) -> the edition's own compact-array file, cached
// for the life of this server process (also content-addressed/append-only).
const compactArrayCache = new Map<string, string[] | null>();

async function getCompactArray(
	fetchFn: typeof fetch,
	iso: string,
	edition: string,
	bookCode: string
): Promise<string[] | null> {
	const cacheKey = `${iso}/${edition}/${bookCode}`;
	const cached = compactArrayCache.get(cacheKey);
	if (cached !== undefined) return cached;

	const fileIndex = await getEditionFileIndex(fetchFn, iso, edition);
	const filename = fileIndex?.get(bookCode);
	if (!filename) {
		compactArrayCache.set(cacheKey, null);
		return null;
	}

	const path = `${iso[0]}/${iso}/${edition}/${filename}`;
	const response = await fetchFn(`${HF_BASE_URL}/${path}`);
	if (!response.ok) {
		compactArrayCache.set(cacheKey, null);
		return null;
	}
	const data = await response.json();
	compactArrayCache.set(cacheKey, data);
	return data;
}

export interface VerseAlignment {
	/** Ordered lexeme numbers, one per content lexeme in this verse. */
	lexemes: string[];
	/** Raw "srcOrd:targetSpan ..." string for this verse (may be ""). */
	compact: string;
}

/**
 * Fetches everything needed to align one chapter of (iso, translationId)
 * against the original languages: per-verse lexeme sequences + the
 * edition's own compact alignment strings, keyed by verse number. Returns
 * `null` if this translation has no published compact-alignments edition
 * at all (most translations, for now — ~200 of ~1256) or doesn't cover this
 * book; callers should render plain, unaligned text in that case, not treat
 * it as an error.
 */
export async function getChapterAlignment(
	fetchFn: typeof fetch,
	iso: string,
	translationId: string,
	bookId: number,
	chapter: number
): Promise<Map<number, VerseAlignment> | null> {
	const book = getBook(bookId);
	if (!book) return null;
	const bookCode = book.usfmCode;
	const edition = deriveEditionFolder(iso, translationId);

	const [lexemesByRef, compactArray] = await Promise.all([
		getBookLexemes(fetchFn, bookCode),
		getCompactArray(fetchFn, iso, edition, bookCode)
	]);
	if (!lexemesByRef || !compactArray) return null;

	const refs = Object.keys(lexemesByRef);
	const result = new Map<number, VerseAlignment>();
	for (let i = 0; i < refs.length; i++) {
		const ref = refs[i];
		// ref is "BOOK C:V" — only the verses in this chapter are relevant.
		const match = /^\S+ (\d+):(\d+)$/.exec(ref);
		if (!match) continue;
		const refChapter = Number(match[1]);
		if (refChapter !== chapter) continue;
		const verse = Number(match[2]);
		result.set(verse, { lexemes: lexemesByRef[ref], compact: compactArray[i] ?? '' });
	}
	return result;
}
