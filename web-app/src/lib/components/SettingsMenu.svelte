<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import TranslationPicker from './TranslationPicker.svelte';

	let open = $state(false);
	let languages = $state<{ code: string; name: string }[] | null>(null);

	function toggle() {
		open = !open;
		if (open && languages === null) {
			fetch('/api/languages')
				.then((res) => res.json())
				.then((data: { code: string; name: string }[]) => {
					languages = data;
				});
		}
	}
</script>

<div class="relative">
	<button
		type="button"
		class="cursor-pointer rounded-lg px-2 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
		onclick={toggle}
		aria-label="Settings"
	>
		⚙︎
	</button>

	{#if open}
		<div
			class="absolute end-0 z-40 mt-2 w-72 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900"
		>
			<div>
				<div class="mb-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Theme</div>
				<div class="flex gap-2">
					{#each ['light', 'dark', 'system'] as const as mode (mode)}
						<button
							type="button"
							class="flex-1 cursor-pointer rounded-lg border px-2 py-1 text-sm capitalize
								{settings.theme === mode
								? 'border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
								: 'border-gray-300 dark:border-gray-700'}"
							onclick={() => (settings.theme = mode)}
						>
							{mode}
						</button>
					{/each}
				</div>
			</div>

			<label class="block">
				<span class="mb-1 block text-sm font-semibold text-gray-500 dark:text-gray-400">
					Hebrew/Greek text size
				</span>
				<input
					type="range"
					min="0.75"
					max="1.75"
					step="0.05"
					bind:value={settings.hebrewGreekFontScale}
					class="w-full"
				/>
			</label>

			<label class="block">
				<span class="mb-1 block text-sm font-semibold text-gray-500 dark:text-gray-400">
					Translation text size
				</span>
				<input
					type="range"
					min="0.75"
					max="1.75"
					step="0.05"
					bind:value={settings.translationFontScale}
					class="w-full"
				/>
			</label>

			<label class="block">
				<span class="mb-1 block text-sm font-semibold text-gray-500 dark:text-gray-400">
					Gloss language
				</span>
				{#if languages === null}
					<div class="text-sm text-gray-400">Loading…</div>
				{:else}
					<select
						class="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
						bind:value={settings.glossLanguage}
					>
						{#each languages as lang (lang.code)}
							<option value={lang.code}>{lang.name}</option>
						{/each}
					</select>
				{/if}
			</label>

			<label class="block">
				<span class="mb-1 block text-sm font-semibold text-gray-500 dark:text-gray-400">
					Second panel translation
				</span>
				<TranslationPicker
					value={settings.alternateTranslation}
					onChange={(v) => (settings.alternateTranslation = v)}
				/>
			</label>
		</div>
	{/if}
</div>
