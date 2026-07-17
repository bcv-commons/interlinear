<script lang="ts">
	import { goto } from '$app/navigation';
	import type { BibleBook } from '$lib/bible-books';
	import { readChapterPath } from '$lib/routes';

	let {
		books,
		book,
		chapter,
		previous,
		next
	}: {
		books: BibleBook[];
		book: BibleBook;
		chapter: number;
		previous: { bookId: number; chapter: number } | null;
		next: { bookId: number; chapter: number } | null;
	} = $props();

	function onBookChange(event: Event) {
		const bookId = Number((event.target as HTMLSelectElement).value);
		goto(readChapterPath(bookId, 1));
	}

	function onChapterChange(event: Event) {
		const newChapter = Number((event.target as HTMLSelectElement).value);
		goto(readChapterPath(book.id, newChapter));
	}

	let chapterOptions = $derived(Array.from({ length: book.chapters }, (_, i) => i + 1));
</script>

<div class="flex items-center gap-2">
	<button
		type="button"
		class="cursor-pointer rounded-lg px-2 py-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
		disabled={!previous}
		onclick={() => previous && goto(readChapterPath(previous.bookId, previous.chapter))}
		aria-label="Previous chapter"
	>
		‹
	</button>

	<select
		class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
		value={book.id}
		onchange={onBookChange}
	>
		{#each books as b (b.id)}
			<option value={b.id}>{b.name}</option>
		{/each}
	</select>

	<select
		class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
		value={chapter}
		onchange={onChapterChange}
	>
		{#each chapterOptions as c (c)}
			<option value={c}>{c}</option>
		{/each}
	</select>

	<button
		type="button"
		class="cursor-pointer rounded-lg px-2 py-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
		disabled={!next}
		onclick={() => next && goto(readChapterPath(next.bookId, next.chapter))}
		aria-label="Next chapter"
	>
		›
	</button>
</div>
