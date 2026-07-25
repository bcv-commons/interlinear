<script lang="ts">
	import type { HelloaoContentBlock } from '$lib/types';
	import { settings } from '$lib/stores/settings.svelte';

	let {
		translationId,
		iso,
		bookId,
		chapter,
		onWordClick,
		hoveredWordId,
		onWordHover
	}: {
		translationId: string;
		iso: string;
		bookId: number;
		chapter: number;
		onWordClick: (wordId: number, anchorRect: DOMRect) => void;
		hoveredWordId: number | null;
		onWordHover: (wordId: number | null) => void;
	} = $props();

	let content = $state<HelloaoContentBlock[] | null | undefined>(undefined);

	$effect(() => {
		const id = translationId;
		const book = bookId;
		const ch = chapter;
		content = undefined;
		const params = new URLSearchParams({ iso });
		fetch(`/api/helloao/${encodeURIComponent(id)}/${book}/${ch}?${params}`)
			.then((res) => res.json())
			.then((data: { content: HelloaoContentBlock[] | null }) => {
				// Ignore stale responses from a since-superseded chapter/translation.
				if (id === translationId && book === bookId && ch === chapter) {
					content = data.content;
				}
			});
	});
</script>

<div class="space-y-3" style="font-size: {1 * settings.translationFontScale}rem">
	{#if content === undefined}
		<div class="text-sm text-gray-400">Loading…</div>
	{:else if content === null}
		<div class="text-sm text-gray-400 italic">
			This chapter isn't available in this translation.
		</div>
	{:else}
		{#each content as block, i (i)}
			{#if block.type === 'heading'}
				<h3 class="pt-2 font-serif text-lg font-semibold">{block.content.join(' ')}</h3>
			{:else if block.type === 'line_break'}
				<div class="h-1"></div>
			{:else if block.type === 'verse'}
				<p class="leading-relaxed" data-verse={block.number}>
					<sup class="me-1 text-xs font-semibold text-gray-400 dark:text-gray-500"
						>{block.number}</sup
					>{#each block.tokens as token, j (j)}{#if token.wordIds && token.wordIds.length > 0}<button
								type="button"
								data-word-btn
								class="cursor-pointer rounded px-0.5 transition-colors hover:bg-amber-200/60 dark:hover:bg-amber-500/20
									{hoveredWordId !== null && token.wordIds.includes(hoveredWordId)
									? 'bg-amber-200/60 dark:bg-amber-500/20'
									: ''}"
								onclick={(e) =>
									onWordClick(
										token.wordIds![0],
										(e.currentTarget as HTMLElement).getBoundingClientRect()
									)}
								onmouseenter={() => onWordHover(token.wordIds![0])}
								onmouseleave={() => onWordHover(null)}>{token.text}</button
							>{:else}{token.text}{/if}{/each}
				</p>
			{/if}
		{/each}
	{/if}
</div>
