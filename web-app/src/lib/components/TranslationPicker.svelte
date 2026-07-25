<script lang="ts">
	import type { HelloaoTranslation } from '$lib/types';

	let {
		value,
		onChange
	}: {
		value: { id: string; name: string; textDirection: 'ltr' | 'rtl'; language: string } | null;
		onChange: (
			value: { id: string; name: string; textDirection: 'ltr' | 'rtl'; language: string } | null
		) => void;
	} = $props();

	let translations = $state<HelloaoTranslation[] | null>(null);
	let query = $state('');
	let listOpen = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	function ensureLoaded() {
		if (translations !== null) return;
		fetch('/api/helloao-translations')
			.then((res) => res.json())
			.then((data: HelloaoTranslation[]) => {
				translations = data;
			});
	}

	function displayLabel(t: HelloaoTranslation): string {
		return t.name === t.englishName
			? `${t.languageEnglishName} — ${t.name}`
			: `${t.languageEnglishName} — ${t.name} (${t.englishName})`;
	}

	let matches = $derived.by((): HelloaoTranslation[] => {
		if (!translations) return [];
		const q = query.trim().toLowerCase();
		if (!q) return translations.slice(0, 50);
		return translations
			.filter((t) =>
				`${t.name} ${t.englishName} ${t.languageName} ${t.languageEnglishName}`
					.toLowerCase()
					.includes(q)
			)
			.slice(0, 50);
	});

	function selectDefault() {
		onChange(null);
		query = '';
		listOpen = false;
	}

	function selectTranslation(t: HelloaoTranslation) {
		onChange({
			id: t.id,
			name: displayLabel(t),
			textDirection: t.textDirection,
			language: t.language
		});
		query = '';
		listOpen = false;
	}

	function handleFocus() {
		ensureLoaded();
		listOpen = true;
	}

	function handleBlur() {
		// Delay so a click on a dropdown option registers before the list closes.
		setTimeout(() => (listOpen = false), 150);
	}
</script>

<div class="relative">
	<input
		bind:this={inputEl}
		type="text"
		class="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
		placeholder={value ? value.name : 'Default (English — Berean Standard Bible)'}
		bind:value={query}
		onfocus={handleFocus}
		onblur={handleBlur}
	/>

	{#if listOpen}
		<div
			class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
		>
			{#if translations === null}
				<div class="px-2 py-1.5 text-gray-400">Loading…</div>
			{:else}
				<button
					type="button"
					class="block w-full cursor-pointer px-2 py-1.5 text-start hover:bg-gray-100 dark:hover:bg-gray-800
						{value === null ? 'font-semibold text-amber-700 dark:text-amber-400' : ''}"
					onclick={selectDefault}
				>
					Default (English — Berean Standard Bible)
				</button>
				{#each matches as t (t.id)}
					<button
						type="button"
						class="block w-full cursor-pointer px-2 py-1.5 text-start hover:bg-gray-100 dark:hover:bg-gray-800
							{value?.id === t.id ? 'font-semibold text-amber-700 dark:text-amber-400' : ''}"
						onclick={() => selectTranslation(t)}
					>
						{displayLabel(t)}
					</button>
				{/each}
				{#if matches.length === 0}
					<div class="px-2 py-1.5 text-gray-400">No matches</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
