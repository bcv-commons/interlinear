<script lang="ts">
	import type { HelloaoContentBlock } from '$lib/types';
	import { settings } from '$lib/stores/settings.svelte';

	let {
		translationId,
		bookId,
		chapter
	}: { translationId: string; bookId: number; chapter: number } = $props();

	let content = $state<HelloaoContentBlock[] | null | undefined>(undefined);

	$effect(() => {
		const id = translationId;
		const book = bookId;
		const ch = chapter;
		content = undefined;
		fetch(`/api/helloao/${encodeURIComponent(id)}/${book}/${ch}`)
			.then((res) => res.json())
			.then((data: { content: HelloaoContentBlock[] | null }) => {
				// Ignore stale responses from a since-superseded chapter/translation.
				if (id === translationId && book === bookId && ch === chapter) {
					content = data.content;
				}
			});
	});

	function verseText(block: Extract<HelloaoContentBlock, { type: 'verse' }>): string {
		return block.content.filter((part) => typeof part === 'string').join(' ');
	}
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
					>{verseText(block)}
				</p>
			{/if}
		{/each}
	{/if}
</div>
