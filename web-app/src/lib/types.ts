export interface HebrewGreekWord {
	id: number;
	text: string;
	strongsCode: string | null;
}

export interface TranslationLine {
	reference: number;
	text: string;
	format: string;
}

export interface WordDetails {
	id: number;
	text: string;
	gloss: string | null;
	strongsCode: string;
	grammar: string;
	grammarExpanded: string;
	strongsRoot: string | null;
	isRtl: boolean;
	lexiconMeanings: LexiconMeaning[];
}

export interface LexiconMeaning {
	lexId: number;
	lemma: string;
	grammar: string | null;
	definitionShort: string | null;
	comments: string | null;
	glosses: string;
}

export interface VerseReference {
	bookId: number;
	bookName: string;
	chapter: number;
	verse: number;
}

export type SimilarVersesMode = 'root' | 'exact';

export interface SimilarVerseWord {
	id: number;
	text: string;
	highlighted: boolean;
}

export interface SimilarVerse extends VerseReference {
	words: SimilarVerseWord[];
}

export interface SimilarVersesResult {
	root: string | null;
	total: number;
	verses: SimilarVerse[];
}
