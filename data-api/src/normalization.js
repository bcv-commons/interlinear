/**
 * Hebrew/Greek text normalization, ported from
 * example/study-app/database_builder/lib/src/hebrew_greek/normalization.dart.
 *
 * Only removePunctuation is ported here — it's the one used at query time
 * (HebrewGreekDatabase.searchExactMatchNoPunctuation, normalizing a tapped
 * word's text before matching it against text.no_punctuation). The fuller
 * normalizeHebrewGreek function is only needed at *build* time to populate
 * that column in the first place — see data-builder/normalization.py, which
 * has both and is the canonical source for this logic.
 *
 * Character ranges are built from explicit integer codepoints (not typed
 * glyphs), matching data-builder/normalization.py's approach — see that
 * module's docstring for why (a lookalike character, e.g. an ASCII ';'
 * where the source means U+037E, is an easy and silent way to get this
 * wrong).
 */

function range(start, end) {
	return String.fromCharCode(start) + '-' + String.fromCharCode(end);
}

function chars(...codepoints) {
	return codepoints.map((c) => String.fromCharCode(c)).join('');
}

// Hebrew block (0590-05FF), Hebrew Presentation Forms (FB1D-FB4F),
// Greek and Coptic (0370-03FF), Greek Extended (1F00-1FFF),
// Combining Diacritical Marks (0300-036F), plus space.
const PUNCTUATION_KEEP = new RegExp(
	'[^ ' +
		range(0x0590, 0x05ff) +
		range(0xfb1d, 0xfb4f) +
		range(0x0370, 0x03ff) +
		range(0x1f00, 0x1fff) +
		range(0x0300, 0x036f) +
		']+',
	'g'
);
// Hebrew: Maqaf (05BE), Paseq (05C0), Sof Pasuk (05C3), Geresh (05F3),
// Gershayim (05F4). Greek: Greek Question Mark (037E, looks like ';' but
// isn't), Ano Teleia (00B7).
const PUNCTUATION_MARKS = new RegExp(
	'[' + chars(0x05be, 0x05c0, 0x05c3, 0x05f3, 0x05f4, 0x037e, 0x00b7) + ']+',
	'g'
);

/** Keep only Hebrew/Greek letters, their combining diacritics, and spaces;
 *  drop Hebrew/Greek punctuation marks; trim and lowercase. */
export function removePunctuation(text) {
	const filtered = text.replace(PUNCTUATION_KEEP, '');
	const cleaned = filtered.replace(PUNCTUATION_MARKS, '');
	return cleaned.trim().toLowerCase();
}
