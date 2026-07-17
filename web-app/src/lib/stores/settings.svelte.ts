import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsData {
	theme: ThemeMode;
	hebrewGreekFontScale: number;
	translationFontScale: number;
	glossLanguage: string;
}

const STORAGE_KEY = 'gbt-web-settings';

const defaults: SettingsData = {
	theme: 'system',
	hebrewGreekFontScale: 1,
	translationFontScale: 1,
	glossLanguage: 'eng'
};

function loadFromStorage(): SettingsData {
	if (!browser) return { ...defaults };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...defaults };
		return { ...defaults, ...JSON.parse(raw) };
	} catch {
		return { ...defaults };
	}
}

class SettingsStore {
	theme = $state<ThemeMode>(defaults.theme);
	hebrewGreekFontScale = $state(defaults.hebrewGreekFontScale);
	translationFontScale = $state(defaults.translationFontScale);
	glossLanguage = $state(defaults.glossLanguage);

	constructor() {
		const initial = loadFromStorage();
		this.theme = initial.theme;
		this.hebrewGreekFontScale = initial.hebrewGreekFontScale;
		this.translationFontScale = initial.translationFontScale;
		this.glossLanguage = initial.glossLanguage;

		if (browser) {
			$effect.root(() => {
				$effect(() => {
					const data: SettingsData = {
						theme: this.theme,
						hebrewGreekFontScale: this.hebrewGreekFontScale,
						translationFontScale: this.translationFontScale,
						glossLanguage: this.glossLanguage
					};
					localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
					this.applyTheme();
				});
			});
		}
	}

	private applyTheme() {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const isDark = this.theme === 'dark' || (this.theme === 'system' && prefersDark);
		document.documentElement.classList.toggle('dark', isDark);
	}
}

export const settings = new SettingsStore();
