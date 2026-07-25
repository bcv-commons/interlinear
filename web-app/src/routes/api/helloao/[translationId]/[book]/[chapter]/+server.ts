import { error, json } from '@sveltejs/kit';
import { getHelloaoChapter } from '$lib/server/helloao';
import { getChapterAlignment } from '$lib/server/compactAlignments';
import { alignVerse, isAlignableSegment } from '$lib/server/alignment';
import { getChapterData } from '$lib/server/dataApi';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const bookId = Number(params.book);
	const chapter = Number(params.chapter);
	if (!Number.isInteger(bookId) || !Number.isInteger(chapter)) {
		error(400, 'Invalid book/chapter');
	}

	const content = await getHelloaoChapter(fetch, params.translationId, bookId, chapter);

	// Word-level alignment is a bonus enrichment, not required for this
	// route to work — most translations (for now) have no published
	// compact-alignments edition, and `iso` is only sent once the client
	// knows it (from the translation picker's own helloao metadata). Either
	// way, missing/failed alignment just leaves every token's `wordIds` at
	// the `null` that `getHelloaoChapter` already set, i.e. plain text.
	const iso = url.searchParams.get('iso');
	if (content && iso) {
		const verseAlignments = await getChapterAlignment(
			fetch,
			iso,
			params.translationId,
			bookId,
			chapter
		);
		if (verseAlignments) {
			const { hebrewGreekWords } = await getChapterData(fetch, bookId, chapter);
			for (const block of content) {
				if (block.type !== 'verse') continue;
				const verseAlignment = verseAlignments.get(block.number);
				if (!verseAlignment) continue;

				// `block.tokens` is the FULL display sequence (punctuation/digits/
				// whitespace included, see helloao.ts's `segmentForDisplay`), but
				// the aligner's own tokenizer — and therefore every ordinal this
				// alignment refers to — only ever counts the letter/mark runs
				// among them. Recover that subsequence's positions within
				// `block.tokens` so alignment ordinals land on the right segment.
				const alignableIndices = block.tokens
					.map((token, index) => ({ index, isAlignable: isAlignableSegment(token.text) }))
					.filter((t) => t.isAlignable)
					.map((t) => t.index);
				const targetTexts = alignableIndices.map((index) => block.tokens[index].text);

				const aligned = alignVerse(
					hebrewGreekWords,
					bookId,
					chapter,
					block.number,
					verseAlignment,
					targetTexts
				);
				for (const [ordinal, wordIds] of aligned) {
					block.tokens[alignableIndices[ordinal]].wordIds = wordIds;
				}
			}
		}
	}

	return json(
		{ content },
		{ headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } }
	);
};
