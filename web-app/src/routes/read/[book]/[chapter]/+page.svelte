<script lang="ts">
	import ChapterReader from '$lib/components/ChapterReader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.book.name} {data.chapter} — Study App</title>
</svelte:head>

<ChapterReader
	book={data.book}
	chapter={data.chapter}
	books={data.books}
	previous={data.previous}
	next={data.next}
	hebrewGreekWords={data.hebrewGreekWords}
/>
