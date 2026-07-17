import { resolve } from '$app/paths';

// No explicit return-type annotation: this must stay inferred as `ResolvedPathname`
// (rather than widened to `string`) so `eslint-plugin-svelte`'s
// `no-navigation-without-resolve` rule recognizes goto()/href call sites that
// go through this helper as resolve()-backed.
export function readChapterPath(bookId: number, chapter: number) {
	return resolve('/read/[book]/[chapter]', { book: String(bookId), chapter: String(chapter) });
}
