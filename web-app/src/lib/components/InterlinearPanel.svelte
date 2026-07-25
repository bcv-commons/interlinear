<script lang="ts">
	import { extractReferenceFromWordId } from '$lib/reference';
	import type { HebrewGreekWord } from '$lib/types';
	import { settings } from '$lib/stores/settings.svelte';

	let {
		words,
		isRtl,
		onWordClick,
		hoveredWordId,
		onWordHover
	}: {
		words: HebrewGreekWord[];
		isRtl: boolean;
		onWordClick: (wordId: number, anchorRect: DOMRect) => void;
		hoveredWordId: number | null;
		onWordHover: (wordId: number | null) => void;
	} = $props();

	interface VerseGroup {
		verse: number;
		words: HebrewGreekWord[];
	}

	let verseGroups = $derived.by((): VerseGroup[] => {
		const groups: VerseGroup[] = [];
		for (const word of words) {
			const verse = extractReferenceFromWordId(word.id).verse;
			const last = groups.at(-1);
			if (last && last.verse === verse) {
				last.words.push(word);
			} else {
				groups.push({ verse, words: [word] });
			}
		}
		return groups;
	});
</script>

<div
	class="space-y-3 font-sbl leading-loose"
	style="font-size: {1.35 * settings.hebrewGreekFontScale}rem"
	dir={isRtl ? 'rtl' : 'ltr'}
>
	{#each verseGroups as group (group.verse)}
		<p data-verse={group.verse}>
			<sup class="me-1 font-sans text-xs font-semibold text-gray-400 dark:text-gray-500"
				>{group.verse}</sup
			>{#each group.words as word (word.id)}
				<button
					type="button"
					data-word-btn
					class="cursor-pointer rounded px-0.5 transition-colors hover:bg-amber-200/60 dark:hover:bg-amber-500/20
						{hoveredWordId === word.id ? 'bg-amber-200/60 dark:bg-amber-500/20' : ''}"
					onclick={(e) =>
						onWordClick(word.id, (e.currentTarget as HTMLElement).getBoundingClientRect())}
					onmouseenter={() => onWordHover(word.id)}
					onmouseleave={() => onWordHover(null)}>{word.text}</button
				>
			{/each}
		</p>
	{/each}
</div>
