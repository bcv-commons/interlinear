import { getLexiconDb } from './connections.js';
import { BOOK_NAMES_BY_ID } from '../book-names.js';

const LEMMA_ID_OFFSET = 1_000_000_000;

// Ported from LexiconSchema.getMeaningsForStrongsQuery in
// database_builder/lib/src/lexicon/schema.dart.
const MEANINGS_FOR_STRONGS_QUERY = `
	SELECT
		m.lex_id AS lexId,
		m.Lemma AS lemma,
		m.definition_short AS definitionShort,
		m.comments AS comments,
		m.glosses AS glosses,
		g.text AS grammar
	FROM meanings AS m
	JOIN strongs AS s
		ON (m.lex_id / ${LEMMA_ID_OFFSET}) = s.lemma_id
	LEFT JOIN grammar AS g
		ON m.grammar_id = g._id
	WHERE s.strongs_code = ?
`;

/** Ported from LexiconsDatabase.getMeaningsForStrongs in
 *  example/study-app/lib/services/lexicon/database.dart. */
export function getMeaningsForStrongs(strongsCode) {
	const rows = getLexiconDb(strongsCode).prepare(MEANINGS_FOR_STRONGS_QUERY).all(strongsCode);

	return rows.map((row) => ({
		lexId: row.lexId,
		lemma: row.lemma,
		grammar: row.grammar,
		definitionShort: replaceReferences(row.definitionShort),
		comments: replaceReferences(row.comments),
		glosses: row.glosses
	}));
}

// Ported from LexiconMeaning._replaceReferences in
// example/study-app/lib/services/lexicon/database.dart.
function replaceReferences(text) {
	if (text == null) return null;

	let result = text.replace(
		/\{L:([^{]*?)<SDB[GH]:([^:]*?)(:.*?)?>\}/g,
		(_match, part1, part2) => (part1 === part2 ? part1 : `${part1} (${part2})`)
	);

	result = result.replace(/\{S:(\d{3})(\d{3})(\d{3})\d{5}\}/g, (_match, bookStr, chapterStr, verseStr) => {
		const book = BOOK_NAMES_BY_ID.get(parseInt(bookStr, 10));
		const chapter = parseInt(chapterStr, 10);
		const verse = parseInt(verseStr, 10);
		return `${book} ${chapter}:${verse}`;
	});

	result = result.replace(/\{N:\d+\}/g, '');
	result = result.replaceAll('◄ ', '');
	result = result.replaceAll('► ', '');

	return result;
}
