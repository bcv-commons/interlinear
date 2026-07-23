<script lang="ts">
	import type { TranslationLine } from '$lib/types';
	import { extractReferenceFromVerseId } from '$lib/reference';
	import {
		stripFootnotes,
		HEADING_FORMATS,
		REFERENCE_NOTE_FORMATS,
		BLANK_FORMATS,
		INDENTED_FORMATS
	} from '$lib/usfm';
	import { settings } from '$lib/stores/settings.svelte';

	let { lines }: { lines: TranslationLine[] } = $props();

	type Block =
		| { kind: 'heading'; text: string }
		| { kind: 'note'; text: string }
		| { kind: 'break' }
		| { kind: 'indented'; verse: number | null; actualVerse: number; text: string }
		| {
				kind: 'paragraph';
				parts: { verse: number | null; actualVerse: number; text: string }[];
		  };

	let blocks = $derived.by((): Block[] => {
		const result: Block[] = [];
		let lastVerseShown = -1;
		let currentParagraph: { verse: number | null; actualVerse: number; text: string }[] | null =
			null;

		const flushParagraph = () => {
			if (currentParagraph && currentParagraph.length > 0) {
				result.push({ kind: 'paragraph', parts: currentParagraph });
			}
			currentParagraph = null;
		};

		for (const line of lines) {
			const text = stripFootnotes(line.text);
			if (HEADING_FORMATS.has(line.format)) {
				flushParagraph();
				if (text) result.push({ kind: 'heading', text });
				continue;
			}
			if (REFERENCE_NOTE_FORMATS.has(line.format)) {
				flushParagraph();
				if (text) result.push({ kind: 'note', text });
				continue;
			}
			if (BLANK_FORMATS.has(line.format)) {
				flushParagraph();
				result.push({ kind: 'break' });
				continue;
			}
			if (!text) continue;

			const verse = extractReferenceFromVerseId(line.reference).verse;
			const verseLabel = verse !== lastVerseShown ? verse : null;
			if (verseLabel !== null) lastVerseShown = verse;

			if (INDENTED_FORMATS.has(line.format)) {
				flushParagraph();
				result.push({ kind: 'indented', verse: verseLabel, actualVerse: verse, text });
				continue;
			}

			currentParagraph ??= [];
			currentParagraph.push({ verse: verseLabel, actualVerse: verse, text });
		}
		flushParagraph();
		return result;
	});
</script>

<div class="space-y-3" style="font-size: {1 * settings.translationFontScale}rem">
	{#each blocks as block, i (i)}
		{#if block.kind === 'heading'}
			<h3 class="pt-2 font-serif text-lg font-semibold">{block.text}</h3>
		{:else if block.kind === 'note'}
			<p class="text-sm text-gray-500 italic dark:text-gray-400">{block.text}</p>
		{:else if block.kind === 'break'}
			<div class="h-1"></div>
		{:else if block.kind === 'indented'}
			<p class="ps-6 leading-relaxed" data-verse={block.actualVerse}>
				{#if block.verse}<sup class="me-1 text-xs font-semibold text-gray-400 dark:text-gray-500"
						>{block.verse}</sup
					>{/if}{block.text}
			</p>
		{:else}
			<p class="leading-relaxed">
				{#each block.parts as part, j (j)}<span data-verse={part.actualVerse}
						>{#if part.verse}<sup
								class="ms-1 me-1 text-xs font-semibold text-gray-400 dark:text-gray-500"
								>{part.verse}</sup
							>{/if}{part.text}</span
					>
				{/each}
			</p>
		{/if}
	{/each}
</div>
