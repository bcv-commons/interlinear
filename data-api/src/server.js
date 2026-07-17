import express from 'express';
import {
	getChapter,
	getStrongsAndGrammar,
	getWordForId,
	strongsCodeRoot,
	getVerseIdsForStrongsCode,
	countVersesForStrongsCode,
	getVerseIdsForExactText,
	countVersesForExactText,
	getWordsForVerse
} from './db/hebrewGreek.js';
import { getGloss } from './db/gloss.js';
import { getTranslationChapter } from './db/translation.js';
import { getMeaningsForStrongs } from './db/lexicon.js';
import { extractReferenceFromVerseId } from './reference.js';
import { removePunctuation } from './normalization.js';
import { BOOK_NAMES_BY_ID } from './book-names.js';
import { expandGrammar } from './morphology.js';
import { listGlossLanguages } from './db/connections.js';
import { LANGUAGE_NAMES } from './language-names.js';

const DEFAULT_GLOSS_LANG = 'eng';

const PORT = process.env.PORT ?? 3000;
const API_KEY = process.env.DATA_API_KEY; // optional shared-secret; unset = open

const MAX_SIMILAR_VERSES = 200;

const app = express();
app.disable('x-powered-by');

app.get('/health', (_req, res) => res.json({ ok: true }));

if (API_KEY) {
	app.use((req, res, next) => {
		if (req.path === '/health') return next();
		if (req.get('x-api-key') !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
		next();
	});
}

// A given chapter's / word's / Strong's code's data never changes at
// runtime, so all responses below are safe to cache aggressively — both by
// this API's own caller (the SvelteKit app) and by any CDN/proxy in front
// of it.
function cacheImmutable(res, maxAgeSeconds) {
	res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, immutable`);
}

app.get('/chapter/:book/:chapter', (req, res) => {
	const bookId = Number(req.params.book);
	const chapter = Number(req.params.chapter);
	if (!Number.isInteger(bookId) || !Number.isInteger(chapter)) {
		return res.status(400).json({ error: 'Invalid book/chapter' });
	}

	cacheImmutable(res, 604_800); // 7 days
	res.json({
		hebrewGreekWords: getChapter(bookId, chapter),
		translationLines: getTranslationChapter(bookId, chapter)
	});
});

app.get('/word/:wordId', (req, res) => {
	const wordId = Number(req.params.wordId);
	if (!Number.isInteger(wordId)) return res.status(400).json({ error: 'Invalid word id' });
	const langCode = typeof req.query.lang === 'string' ? req.query.lang : DEFAULT_GLOSS_LANG;

	const text = getWordForId(wordId);
	const strongsAndGrammar = getStrongsAndGrammar(wordId);
	if (text === null || strongsAndGrammar === null) {
		return res.status(404).json({ error: 'Word not found' });
	}

	const { strongsCode, grammar } = strongsAndGrammar;

	cacheImmutable(res, 604_800); // 7 days
	res.json({
		id: wordId,
		text,
		gloss: getGloss(langCode, wordId),
		strongsCode,
		grammar,
		grammarExpanded: expandGrammar(grammar),
		strongsRoot: strongsCodeRoot(strongsCode),
		isRtl: strongsCode.startsWith('H'),
		lexiconMeanings: getMeaningsForStrongs(strongsCode)
	});
});

app.get('/languages', (_req, res) => {
	const codes = listGlossLanguages();
	cacheImmutable(res, 3600); // 1 hour — short, since new .db files can be added without a full redeploy
	res.json({
		languages: codes.map((code) => ({ code, name: LANGUAGE_NAMES[code] ?? code }))
	});
});

// Ported from SimilarVerseManager in
// example/study-app/lib/ui/home/word_details_dialog/similar_verses/similar_verse_manager.dart,
// which offers two search modes from the same "similar verses" screen:
// "root" (every word sharing this Strong's code) and "exact" (exact
// surface-text match, ignoring punctuation) — with the matching word
// highlighted inline within each result verse's full text either way.
app.get('/similar/:strongsCode', (req, res) => {
	const strongsCode = req.params.strongsCode;
	const mode = req.query.mode === 'exact' ? 'exact' : 'root';
	const text = typeof req.query.text === 'string' ? req.query.text : '';

	const root = strongsCodeRoot(strongsCode);

	let verseIds, total;
	if (mode === 'exact') {
		verseIds = getVerseIdsForExactText(text, MAX_SIMILAR_VERSES);
		total = countVersesForExactText(text);
	} else {
		verseIds = getVerseIdsForStrongsCode(strongsCode, MAX_SIMILAR_VERSES);
		total = countVersesForStrongsCode(strongsCode);
	}

	const normalizedText = removePunctuation(text);
	const verses = verseIds.map((verseId) => {
		const { bookId, chapter, verse } = extractReferenceFromVerseId(verseId);
		const words = getWordsForVerse(bookId, chapter, verse).map((word) => ({
			id: word.id,
			text: word.text,
			highlighted:
				mode === 'exact'
					? removePunctuation(word.text) === normalizedText
					: word.strongsCode === strongsCode
		}));
		return {
			bookId,
			bookName: BOOK_NAMES_BY_ID.get(bookId) ?? `Book ${bookId}`,
			chapter,
			verse,
			words
		};
	});

	cacheImmutable(res, 86_400); // 1 day
	res.json({ root, total, verses });
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
	console.log(`gbt-data-api listening on :${PORT}`);
});
