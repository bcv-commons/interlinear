import { extractReferenceFromWordId } from '$lib/reference';
import type { HebrewGreekWord } from '$lib/types';
import type { VerseAlignment } from './compactAlignments';

/**
 * Splits a target-language verse's own text into the tokens
 * `compact-alignments`' target-span indices address — NOT whitespace or
 * punctuation splitting. Per the aligner's own published rule (`compact-
 * alignments/README.md`, reference JS implementation): a token is a maximal
 * run of Unicode letters + combining marks (`\p{L}\p{M}`); punctuation,
 * whitespace, AND digits are all separators and produce no token at all —
 * a bare number like "40" is invisible to this tokenizer, not its own
 * token. Getting this wrong is a live-verified failure mode: an earlier
 * whitespace-based tokenizer here counted "40" as a token, which shifted
 * every later position in the verse by one and looked exactly like a
 * systematic alignment bug (8 apparent mismatches in ACT 1:3/ind_ags
 * collapsed to 2 genuine ones once this exact rule was used).
 *
 * Caveat inherited from the upstream reference implementation: this JS
 * version doesn't strip non-spacing combining marks the way the aligner's
 * authoritative Python `tokenize()` does (no JS built-in equivalent to
 * `unicodedata.combining()`), so it's exact for Latin/Cyrillic/Greek-script
 * targets but may drift slightly on a diacritic-heavy script (Hebrew,
 * Arabic, Devanagari).
 */
export function tokenize(text: string): string[] {
	return text.normalize('NFC').match(/[\p{L}\p{M}]+/gu) ?? [];
}

/**
 * The aligner's tokenizer drops everything that isn't a letter/mark run —
 * exactly right for *indexing* alignment targets, but wrong for *display*:
 * we still need to show the punctuation, digits, and whitespace the
 * aligner's own tokens skip over. This splits text into the full ordered
 * sequence of runs (both letter/mark runs AND everything between them),
 * so re-joining every segment's `text` reconstructs the original exactly —
 * only the letter/mark runs are ever alignment targets.
 */
export function segmentForDisplay(text: string): string[] {
	return text.normalize('NFC').match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu) ?? [];
}

/** Whether a `segmentForDisplay` segment is one of the letter/mark runs
 *  `tokenize()` would also produce (i.e. a possible alignment target), as
 *  opposed to the punctuation/digit/whitespace runs between them. Segments
 *  are homogeneous by construction, so testing any one character suffices. */
export function isAlignableSegment(segment: string): boolean {
	return /[\p{L}\p{M}]/u.test(segment);
}

/**
 * Strips the H/G testament letter and any trailing lowercase sense-split
 * letter from a Strong's-style code (e.g. "H1254a" -> 1254, "G3588" -> 3588,
 * "6960a" -> 6960) so it can be compared purely by lexeme *number* — the
 * published `_lexemes.json` sequence isn't always the bare integer some
 * verses' were (GEN 1:1's "1254" has no letter), it can carry its own
 * trailing sense-split letter too (GEN 1:9's "6960a", 1:10's "4723a"), and
 * that letter isn't guaranteed to match ours (our own word for GEN 1:9 is
 * "H6960b", not "H6960a"). Comparing on the number alone — via `parseInt`,
 * not `Number`, since `Number("6960a")` is `NaN` and silently fails every
 * match — is what both sides actually need to agree on.
 */
function normalizeLexemeNumber(code: string): number {
	return parseInt(code.replace(/^[HG]/, '').replace(/[a-z]$/, ''), 10);
}

function decodeSpan(span: string): number[] {
	if (span.includes('-')) {
		const [lo, hi] = span.split('-').map(Number);
		return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
	}
	if (span.includes(',')) return span.split(',').map(Number);
	return [Number(span)];
}

function parseCompactString(compact: string): Map<number, string> {
	const pairs = new Map<number, string>();
	if (!compact) return pairs;
	for (const part of compact.split(' ')) {
		const [ordinal, span] = part.split(':');
		pairs.set(Number(ordinal), span);
	}
	return pairs;
}

/**
 * Aligns one verse's target-language tokens back to our own
 * `hebrewGreekWords` ids, purely by matching Strong's numbers in sequence
 * against the published lexeme list — no morphology/grammar inspection.
 * `chapterWords` may span the whole chapter; only this verse's words are
 * considered. Returns a map of target token index -> the original word
 * id(s) aligned to it (only tokens with at least one alignment appear).
 *
 * Deliberately all-or-nothing per verse on a sequence mismatch (rather than
 * partially aligning past the point where our word list and the published
 * lexeme sequence stop agreeing) — a mismatch here means either edition
 * drift or a versification difference, and a partial/wrong alignment would
 * be worse than none. Individual out-of-bounds target spans (e.g. a
 * translation edited since the alignment was computed) are skipped
 * one-by-one instead, since those don't indicate the whole verse is untrustworthy.
 */
export function alignVerse(
	chapterWords: HebrewGreekWord[],
	bookId: number,
	chapter: number,
	verse: number,
	alignment: VerseAlignment,
	targetTokens: string[]
): Map<number, number[]> {
	const verseWords = chapterWords.filter((word) => {
		const ref = extractReferenceFromWordId(word.id);
		return ref.bookId === bookId && ref.chapter === chapter && ref.verse === verse;
	});

	const wordIdByOrdinal: (number | undefined)[] = [];
	let pointer = 0;
	for (let ordinal = 0; ordinal < alignment.lexemes.length; ordinal++) {
		const targetLexeme = normalizeLexemeNumber(alignment.lexemes[ordinal]);
		let found: number | undefined;
		while (pointer < verseWords.length) {
			const word = verseWords[pointer];
			pointer++;
			if (word.strongsCode && normalizeLexemeNumber(word.strongsCode) === targetLexeme) {
				found = word.id;
				break;
			}
		}
		if (found === undefined) return new Map(); // sequence mismatch — abort the whole verse
		wordIdByOrdinal.push(found);
	}

	const pairs = parseCompactString(alignment.compact);
	const result = new Map<number, number[]>();
	for (const [ordinal, span] of pairs) {
		const wordId = wordIdByOrdinal[ordinal];
		if (wordId === undefined) continue;
		const indices = decodeSpan(span);
		if (indices.some((i) => i < 0 || i >= targetTokens.length)) continue; // stale/out of bounds
		for (const i of indices) {
			const existing = result.get(i);
			if (existing) existing.push(wordId);
			else result.set(i, [wordId]);
		}
	}
	return result;
}
