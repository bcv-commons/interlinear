<script lang="ts">
	/** Level 1: a small, non-modal floating hint — just the gloss, shown
	 *  directly above the tapped word. Ported from the Flutter app's
	 *  single-tap popup (panel_area/hebrew_greek_panel/text.dart), which
	 *  shows only the gloss and auto-dismisses after 3 seconds. The whole
	 *  bubble is the tap target to promote to the full level-2 popover —
	 *  not just a small icon — since a bespoke web UI doesn't have the
	 *  benefit of an OS-level learned "there's more" convention the way
	 *  Kindle/Apple's tap-to-define does. */
	import { untrack } from 'svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const AUTO_DISMISS_MS = 3000;
	const MARGIN = 8;

	let {
		wordId,
		gloss,
		loading,
		anchorRect,
		onPromote,
		onDismiss
	}: {
		wordId: number;
		gloss: string | null;
		loading: boolean;
		anchorRect: DOMRect;
		onPromote: () => void;
		onDismiss: () => void;
	} = $props();

	let bubbleEl: HTMLElement | undefined = $state();
	// anchorRect is stable for this component's whole lifetime (the parent
	// remounts WordHint via {#key} for every new hint), so this is a
	// deliberate one-time read to seed the initial (pre-measurement) position.
	let placement = $state<{ top: number; left: number; above: boolean }>(
		untrack(() => ({ top: anchorRect.top, left: anchorRect.left, above: true }))
	);

	$effect(() => {
		void wordId; // restart the timer whenever a new word's hint is shown
		const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!bubbleEl) return;
		const bubbleRect = bubbleEl.getBoundingClientRect();

		let left = anchorRect.left + anchorRect.width / 2 - bubbleRect.width / 2;
		left = Math.max(MARGIN, Math.min(left, window.innerWidth - bubbleRect.width - MARGIN));

		const above = anchorRect.top - bubbleRect.height - MARGIN >= 0;
		const top = above ? anchorRect.top - bubbleRect.height - MARGIN : anchorRect.bottom + MARGIN;

		placement = { top, left, above };
	});
</script>

<div
	bind:this={bubbleEl}
	role="button"
	tabindex="0"
	class="fixed z-40 max-w-xs cursor-pointer rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
	style="top: {placement.top}px; left: {placement.left}px"
	onclick={onPromote}
	onkeydown={(e) => e.key === 'Enter' && onPromote()}
>
	{#if loading}
		<span class="opacity-70">…</span>
	{:else if gloss}
		<span style="font-size: {1.1 * settings.hebrewGreekFontScale}rem">{gloss}</span>
	{:else}
		<span class="italic opacity-70">No gloss</span>
	{/if}
	<span class="ms-1.5 opacity-50">›</span>
</div>
