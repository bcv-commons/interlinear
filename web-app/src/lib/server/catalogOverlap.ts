// Cross-checks bcv-commons/bibles' catalog-overlap.json for helloAO
// translation ids it's verified unreachable. Needed because helloao.org
// doesn't 404 for a missing/invalid translation id — it falls back to
// serving its own docs site (HTTP 200, text/html), so a plain fetch can't
// tell "unavailable" from "working" without this cross-check. Verified
// live against all 410 `r: false` helloAO entries in the file as of
// 2026-07-28: 409 confirmed genuinely unreachable (HTML fallback, not
// JSON), 1 false positive (stale data — the translation was actually
// live). Good enough to filter the translation picker with, not perfect.
const CATALOG_OVERLAP_URL = 'https://cdn.bibel.wiki/dbt/_app/catalog-overlap.json';

interface OverlapCluster {
	ids: string[];
	r?: boolean;
}

let cachedUnreachableIds: Promise<Set<string>> | undefined;

export function getUnreachableHelloaoIds(fetchFn: typeof fetch): Promise<Set<string>> {
	cachedUnreachableIds ??= fetchUnreachableIds(fetchFn);
	return cachedUnreachableIds;
}

async function fetchUnreachableIds(fetchFn: typeof fetch): Promise<Set<string>> {
	const ids = new Set<string>();
	try {
		const response = await fetchFn(CATALOG_OVERLAP_URL);
		if (!response.ok) return ids;
		const data: { entries: Record<string, OverlapCluster[]> } = await response.json();
		for (const clusters of Object.values(data.entries)) {
			for (const cluster of clusters) {
				if (cluster.r !== false) continue;
				for (const id of cluster.ids) {
					if (id.startsWith('h:')) ids.add(id.slice(2));
				}
			}
		}
	} catch {
		// This is an optional cleanliness cross-check, not a required data
		// source — if it's unreachable, fail open (show the unfiltered
		// list) rather than block the translation picker over it.
	}
	return ids;
}
