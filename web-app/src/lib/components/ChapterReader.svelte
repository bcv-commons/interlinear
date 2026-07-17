<script lang="ts">
	import BookChapterNav from './BookChapterNav.svelte';
	import SettingsMenu from './SettingsMenu.svelte';
	import InterlinearPanel from './InterlinearPanel.svelte';
	import TranslationPanel from './TranslationPanel.svelte';
	import WordHint from './WordHint.svelte';
	import WordPopover from './WordPopover.svelte';
	import type { BibleBook } from '$lib/bible-books';
	import type { HebrewGreekWord, TranslationLine, WordDetails } from '$lib/types';
	import { syncScrollPanels, resetScrollPanels } from '$lib/scrollSync';
	import { settings } from '$lib/stores/settings.svelte';

	let {
		book,
		chapter,
		books,
		previous,
		next,
		hebrewGreekWords,
		translationLines
	}: {
		book: BibleBook;
		chapter: number;
		books: BibleBook[];
		previous: { bookId: number; chapter: number } | null;
		next: { bookId: number; chapter: number } | null;
		hebrewGreekWords: HebrewGreekWord[];
		translationLines: TranslationLine[];
	} = $props();

	// Three levels of word info, ported from the Flutter app's tap (level 1,
	// a lightweight floating gloss-only hint) / long-press (level 2, the
	// full popover) / tap-the-grammar-code-within-that (level 3) model. On
	// the web there's no long-press-vs-tap distinction, so level 1->2 is
	// "click the hint bubble" instead — see WordHint.svelte.
	let hint = $state<{
		wordId: number;
		anchorRect: DOMRect;
		details: WordDetails | null;
		nonce: number;
	} | null>(null);
	let popover = $state<{ wordId: number; initialDetails: WordDetails | null } | null>(null);
	let hintNonce = 0;

	async function handleWordClick(wordId: number, anchorRect: DOMRect) {
		hintNonce++;
		const nonce = hintNonce;
		hint = { wordId, anchorRect, details: null, nonce };

		const response = await fetch(
			`/api/word/${wordId}?lang=${encodeURIComponent(settings.glossLanguage)}`
		);
		const details: WordDetails = await response.json();
		// Ignore if the user already dismissed/replaced/promoted this hint.
		if (hint?.nonce === nonce) hint = { ...hint, details };
	}

	function dismissHint() {
		hint = null;
	}

	function promoteHint() {
		if (!hint) return;
		popover = { wordId: hint.wordId, initialDetails: hint.details };
		hint = null;
	}

	function closePopover() {
		popover = null;
	}

	/** Word clicks manage their own hint state directly; this only handles
	 *  clicks elsewhere in a panel (background, translation text, etc). */
	function handlePanelBackgroundClick(event: MouseEvent) {
		if (!hint) return;
		if ((event.target as HTMLElement).closest('[data-word-btn]')) return;
		dismissHint();
	}

	let interlinearEl: HTMLElement | undefined = $state();
	let translationEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (!interlinearEl || !translationEl) return;
		return syncScrollPanels(interlinearEl, translationEl);
	});

	$effect(() => {
		// Re-run whenever the displayed chapter changes; both panels' previous
		// scroll position is meaningless for a different chapter's content.
		void book.id;
		void chapter;
		if (!interlinearEl || !translationEl) return;
		resetScrollPanels(interlinearEl, translationEl);
		dismissHint();
	});
</script>

<div class="flex h-dvh flex-col">
	<header
		class="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-2 dark:border-gray-800"
	>
		<h1 class="hidden text-lg font-semibold sm:block">{book.name} {chapter}</h1>
		<BookChapterNav {books} {book} {chapter} {previous} {next} />
		<SettingsMenu />
	</header>

	<main
		class="flex min-h-0 flex-1 flex-col divide-y divide-gray-200 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-gray-800"
	>
		<!-- Clicking here is a dismiss-the-hint convenience, not an essential
			interaction — Escape and the hint's own auto-dismiss timer already
			cover keyboard/screen-reader users, so this intentionally doesn't
			need its own keyboard handler. -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<section
			bind:this={interlinearEl}
			class="min-h-0 flex-1 overflow-y-auto p-4"
			onclick={handlePanelBackgroundClick}
		>
			<InterlinearPanel
				words={hebrewGreekWords}
				isRtl={book.testament === 'ot'}
				onWordClick={handleWordClick}
			/>
		</section>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<section
			bind:this={translationEl}
			class="min-h-0 flex-1 overflow-y-auto p-4"
			onclick={handlePanelBackgroundClick}
		>
			<TranslationPanel lines={translationLines} />
		</section>
	</main>
</div>

{#if hint}
	{#key hint.nonce}
		<WordHint
			wordId={hint.wordId}
			gloss={hint.details?.gloss ?? null}
			loading={hint.details === null}
			anchorRect={hint.anchorRect}
			onPromote={promoteHint}
			onDismiss={dismissHint}
		/>
	{/key}
{/if}

{#if popover}
	<WordPopover
		wordId={popover.wordId}
		initialDetails={popover.initialDetails}
		onClose={closePopover}
	/>
{/if}
