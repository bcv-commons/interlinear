/** Strips inline USFM footnote markers, e.g. `\f + \fr 1:3 \ft Cited in ...\f*`,
 *  from Berean Standard Bible translation text. */
export function stripFootnotes(text: string): string {
	return text.replace(/\\f\s.*?\\f\*/g, '').trim();
}

/** Format codes seen in eng_bsb.db that render as a section/title heading. */
export const HEADING_FORMATS = new Set(['s1', 's2', 'ms', 'd']);

/** Format codes for a small italic parallel-passage reference note. */
export const REFERENCE_NOTE_FORMATS = new Set(['r', 'mr']);

/** Format codes that indicate a paragraph break with no visible content. */
export const BLANK_FORMATS = new Set(['b']);

/** Format codes for poetry/list lines that render on their own indented line. */
export const INDENTED_FORMATS = new Set(['q1', 'q2', 'qr', 'qa', 'li1', 'li2']);
