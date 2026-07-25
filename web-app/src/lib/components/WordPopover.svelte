<script lang="ts">
	import { untrack } from 'svelte';
	import type { WordDetails, SimilarVersesMode, SimilarVersesResult } from '$lib/types';
	import { readChapterPath } from '$lib/routes';
	import { settings } from '$lib/stores/settings.svelte';

	// Hebrew Maqaf (U+05BE) — a word ending in it is joined directly to the
	// next word with no space, matching normal Hebrew typography. Ported
	// from SimilarVerseManager._formatVerse's `maqaph` handling.
	const MAQAPH = String.fromCharCode(0x05be);

	let {
		wordId,
		initialDetails = null,
		onClose
	}: { wordId: number; initialDetails?: WordDetails | null; onClose: () => void } = $props();

	// wordId/initialDetails are stable for this component's whole lifetime
	// (ChapterReader creates a fresh WordPopover per word), so this is a
	// deliberate one-time read, not a reactive dependency.
	const initial = untrack(() => {
		const usable = initialDetails !== null && initialDetails.id === wordId;
		return {
			details: usable ? initialDetails : null,
			fetchedForLang: usable ? settings.glossLanguage : null
		};
	});

	let details = $state<WordDetails | null>(initial.details);
	let loading = $state(initial.details === null);
	// Level 3: the grammar code is shown raw by default; expanding it in
	// place (rather than a second nested dialog) avoids stacking modals —
	// see the ChapterReader/WordHint discussion for why.
	let grammarIsExpanded = $state(false);
	let copied = $state(false);
	let similarMode = $state<SimilarVersesMode>('root');
	let similarResult = $state<SimilarVersesResult | null>(null);
	let loadingSimilar = $state(false);

	// Tracks which language `details` was fetched for, so we can skip an
	// unnecessary re-fetch on mount when `initialDetails` was already loaded
	// for the currently-selected language (i.e. promoted from a level-1
	// hint), while still refetching if the user changes language later.
	let fetchedForLang: string | null = initial.fetchedForLang;

	$effect(() => {
		const lang = settings.glossLanguage;
		if (fetchedForLang === lang) return;
		fetchedForLang = lang;

		loading = true;
		details = null;
		// A failed/erroring fetch must resolve to `null`, not a truthy-but-
		// malformed object — otherwise a transient network hiccup renders
		// identically to a genuine "word not found" below.
		fetch(`/api/word/${wordId}?lang=${encodeURIComponent(lang)}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data: WordDetails | null) => {
				details = data;
			})
			.catch(() => {
				details = null;
			})
			.finally(() => {
				loading = false;
			});
	});

	function loadSimilarVerses(mode: SimilarVersesMode = similarMode) {
		if (!details) return;
		similarMode = mode;
		loadingSimilar = true;
		const params = new URLSearchParams({ mode, text: details.text });
		fetch(`/api/similar/${details.strongsCode}?${params}`)
			.then((res) => res.json())
			.then((data: SimilarVersesResult) => {
				similarResult = data;
			})
			.finally(() => {
				loadingSimilar = false;
			});
	}

	async function handleCopy() {
		if (!details) return;
		await navigator.clipboard.writeText(details.text);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
	onclick={onClose}
	role="presentation"
>
	<!-- This div's only job is to stop clicks inside the card from bubbling
		to the backdrop's onClose above — it isn't itself an interactive
		control, so it doesn't need its own keyboard handler (Escape is
		handled globally via svelte:window above; adding an onkeydown here
		that stops propagation would swallow that Escape keydown too, since
		focus can end up inside this card after clicking a button in it). -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-gray-900"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		{#if loading}
			<p class="py-8 text-center text-gray-400">Loading…</p>
		{:else if details}
			<div class="flex items-start justify-between gap-4">
				<div dir={details.isRtl ? 'rtl' : 'ltr'} class="font-sbl text-3xl">{details.text}</div>
				<button
					type="button"
					class="cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
					onclick={onClose}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div class="mt-3 flex items-center gap-4">
				<button
					type="button"
					class="cursor-pointer text-sm font-medium text-amber-700 hover:underline dark:text-amber-500"
					onclick={() => loadSimilarVerses()}
					disabled={similarResult !== null || loadingSimilar}
				>
					{loadingSimilar ? 'Loading…' : 'Similar verses'}
				</button>
				<button
					type="button"
					class="cursor-pointer text-sm font-medium text-gray-500 hover:underline dark:text-gray-400"
					onclick={handleCopy}
				>
					{copied ? 'Copied!' : 'Copy word'}
				</button>
			</div>

			<dl class="mt-4 space-y-3 text-sm">
				<div>
					<dt class="font-semibold text-gray-500 dark:text-gray-400">Grammar</dt>
					<dd>
						<button
							type="button"
							class="cursor-pointer rounded text-start hover:bg-amber-100/60 dark:hover:bg-amber-500/10"
							onclick={() => (grammarIsExpanded = !grammarIsExpanded)}
							aria-expanded={grammarIsExpanded}
						>
							{details.grammar}
							<span
								class="ms-1 text-gray-400 transition-transform {grammarIsExpanded
									? 'rotate-90'
									: ''}">›</span
							>
						</button>
						{#if grammarIsExpanded}
							<div class="mt-1 text-gray-600 dark:text-gray-300">{details.grammarExpanded}</div>
						{/if}
					</dd>
				</div>
				{#if details.gloss}
					<div>
						<dt class="font-semibold text-gray-500 dark:text-gray-400">Gloss</dt>
						<dd>{details.gloss}</dd>
					</div>
				{/if}
			</dl>

			{#if details.lexiconMeanings.length > 0}
				<div class="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
					<h4 class="mb-2 font-semibold text-gray-500 dark:text-gray-400">Lexicon</h4>
					<ol class="list-decimal space-y-3 ps-5 text-sm">
						{#each details.lexiconMeanings as meaning (meaning.lexId)}
							<li>
								<div class="font-medium">{meaning.glosses}</div>
								{#if meaning.definitionShort}
									<div class="text-gray-600 dark:text-gray-300">{meaning.definitionShort}</div>
								{/if}
								{#if meaning.comments}
									<div class="mt-1 text-xs text-gray-500 italic dark:text-gray-400">
										{meaning.comments}
									</div>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			{/if}

			{#if similarResult !== null}
				<div class="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
					<div class="mb-2 flex items-center justify-between gap-2">
						<h4 class="font-semibold text-gray-500 dark:text-gray-400">
							Similar to {similarResult.root ?? details.text} ({similarResult.total})
						</h4>
						<div class="flex gap-1 text-xs">
							{#each ['root', 'exact'] as const as mode (mode)}
								<button
									type="button"
									class="cursor-pointer rounded px-2 py-0.5 capitalize
										{similarMode === mode
										? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
										: 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}"
									disabled={loadingSimilar}
									onclick={() => mode !== similarMode && loadSimilarVerses(mode)}
								>
									{mode}
								</button>
							{/each}
						</div>
					</div>
					<ul class="max-h-64 space-y-2 overflow-y-auto text-sm">
						{#each similarResult.verses as verse (`${verse.bookId}-${verse.chapter}-${verse.verse}`)}
							<li>
								<a
									class="font-medium text-amber-700 hover:underline dark:text-amber-500"
									href={readChapterPath(verse.bookId, verse.chapter)}
									onclick={onClose}
								>
									{verse.bookName}
									{verse.chapter}:{verse.verse}
								</a>
								<p class="font-sbl" dir={details.isRtl ? 'rtl' : 'ltr'}>
									{#each verse.words as word, i (word.id)}<span
											class={word.highlighted
												? 'rounded bg-amber-200/70 px-0.5 dark:bg-amber-500/30'
												: ''}>{word.text}</span
										>{i < verse.words.length - 1 && !word.text.endsWith(MAQAPH) ? ' ' : ''}{/each}
								</p>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{:else}
			<p class="py-8 text-center text-gray-400">Word not found.</p>
		{/if}
	</div>
</div>
