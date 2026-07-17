# data-api contract

This is the exact contract the SvelteKit web-app client (`web-app/src/lib/server/dataApi.ts`)
requires from whatever is running at `DATA_API_URL`. Implement this against
any backend — the bundled Express service in this directory, or an existing
service you already run on Hetzner — and the web-app doesn't need to change
at all.

The client only ever calls four routes, all `GET`, all returning JSON.
There is no `POST`/`PUT`/etc, no request body, and no cookies/session
state — every response depends only on its URL (including query string).

## Auth

If the client is configured with `DATA_API_KEY` (a `web-app` environment
variable), every request includes:

```
x-api-key: <DATA_API_KEY>
```

If `DATA_API_KEY` is unset on the `web-app` side, no such header is sent —
your backend can require it, ignore it, or use a completely different
scheme (mTLS, IP allowlist, a different header name) instead. The web-app
client doesn't currently support anything other than this single static
header, so if you want a different auth mechanism, that's a one-line change
in `dataApi.ts`, not a constraint on your backend.

## Error handling

The client checks only `response.ok` (i.e. status in 200–299). On failure
it raises a SvelteKit `error(response.status, ...)` — **the response body
on error is never read or parsed.** Return any status code that
accurately reflects the failure (400 for a malformed param, 404 for "not
found", 500 for a server error); the body can be empty, plain text, or
JSON — it doesn't matter to this client. A `{"error": "..."}` JSON body is
recommended anyway for your own observability/logging, not because the
client needs it.

## Caching

Not required for correctness — `web-app`'s own routes
(`+page.server.ts`, `/api/word`, `/api/similar`, `/api/languages`) already
set their own `Cache-Control` headers on the responses the browser/CDN
actually see, independent of whatever your backend returns. Setting
`Cache-Control` here too is still a good idea if anything else (a CDN, a
reverse proxy cache) sits in front of your service directly, since all four
endpoints below return data that's static (or near-static — see
`/languages`) at runtime.

---

## `GET /chapter/:book/:chapter`

`:book` and `:chapter` are positive integers (`:book` 1–66).

**Deviation seen in the wild:** the production backend this client
currently points at (a separate service, not the one in this directory)
keys `:book` by the 3-letter USFM code (`GEN`, `MAT`, ...) instead, "kept
consistent with every other route on that service." The client
(`web-app/src/lib/server/dataApi.ts`) translates for this at the one call
site via `bible-books.ts`'s `getUsfmCode()` — if you're implementing this
contract fresh, prefer the numeric id as specified above; the translation
shim is only there to match an existing backend's convention.

**Response 200:**

```ts
{
  hebrewGreekWords: {
    id: number;           // packed BBCCCVVVWW: book(2) chapter(3) verse(3) word(2)
    text: string;         // the Hebrew/Greek word, with diacritics
    strongsCode: string | null;  // e.g. "H7225", "G3588a" — null should not normally occur
  }[];
  translationLines: {
    reference: number;     // packed BCCCVVV: book(1-2) chapter(3) verse(3)
    text: string;          // raw text, may contain USFM footnote markers (\f ... \f*) — web-app strips these client-side
    format: string;        // USFM paragraph/style marker, e.g. "m", "s1", "q1", "b" — web-app interprets these, don't need to
  }[];
}
```

Both arrays must be ordered ascending by `id`/`reference` (word order /
verse order) — the client does not re-sort. `hebrewGreekWords` should cover
exactly the requested chapter (all book/chapter/verse/word ids with that
book+chapter prefix); `translationLines` likewise, including any non-verse
lines (chapter headings, section headings, blank-line markers) that share
the chapter's `reference` range.

**Never changes at runtime** for a given `:book`/`:chapter` — safe to cache
indefinitely (until you redeploy with updated source data).

## `GET /word/:wordId?lang=<code>`

`:wordId` is the same packed integer id as `hebrewGreekWords[].id` above.
`lang` is optional, a code like `eng` or `spa` from `/languages` below —
**if omitted, default to `eng`** (the web-app client always sends it, but
don't rely on that if you're implementing this contract independently).

**Response 200:**

```ts
{
  id: number;
  text: string;                 // same as hebrewGreekWords[].text for this id
  gloss: string | null;         // gloss in the requested `lang`, or null if
                                 // this word has none recorded (or `lang` is unrecognized)
  strongsCode: string;
  grammar: string;              // raw morphology code, e.g. "Prep-b | N-fs"
  grammarExpanded: string;      // human-readable expansion of `grammar`
  strongsRoot: string | null;
  isRtl: boolean;                // true for Hebrew (strongsCode starts with "H")
  lexiconMeanings: {
    lexId: number;
    lemma: string;
    grammar: string | null;      // part of speech, e.g. "nsf"
    definitionShort: string | null;
    comments: string | null;
    glosses: string;             // comma-separated short glosses, English only
  }[];
}
```

Everything except `gloss` is language-independent (the lexicon is English
only regardless of `lang` — there's no per-language lexicon data upstream).

**Response 404** if `:wordId` doesn't exist.

**Never changes at runtime** for a given `:wordId` + `lang` pair — safe to
cache indefinitely.

## `GET /similar/:strongsCode?mode=root|exact&text=<word>`

`:strongsCode` is a string like `H7225` or `G3588`. `mode` defaults to
`root` if omitted or unrecognized. `text` is the tapped word's own text
(`HebrewGreekWord.text`/`WordDetails.text`) — required for `exact` mode
(what it searches by), unused for `root` mode.

**Response 200:**

```ts
{
  root: string | null;   // the Strong's code's root/lemma word, e.g. "רֵאשִׁית" —
                          // this is the only place a Strong's-code-derived value
                          // is surfaced to the user; the raw code itself never is
  total: number;          // true count of distinct verses — may be larger than verses.length
  verses: {
    bookId: number;
    bookName: string;     // English book name, e.g. "Genesis"
    chapter: number;
    verse: number;
    words: {
      id: number;
      text: string;
      highlighted: boolean;   // true if this word is what matched the search
    }[];                       // the verse's full word sequence, in order
  }[];
}
```

Two independent search semantics, both scanning `hebrew_greek.db`:
- **`root`**: every word sharing `:strongsCode`, regardless of surface form.
- **`exact`**: every word whose text exactly matches `text`, ignoring
  punctuation/case — independent of Strong's code entirely (two different
  words can share a surface form).

Each result verse includes its full word list (not just the matching word)
so the client can render the verse in context with the match highlighted —
`highlighted` is computed the same way per mode: `word.strongsCode ===
strongsCode` for root, normalized-text equality for exact.

`verses` should be capped (the bundled implementation caps at 200) and
deduplicated to one entry per verse (a match can occur more than once in
the same verse) — `total` reports the real count so the client can say
"showing 200 of 7,000". **Push the cap and dedup into your query, not into
application code that fetches every match first** — for a common word
(e.g. the Greek article, ~20,000 occurrences) that's the difference between
a sub-5ms indexed query and a 70ms+ full table scan; see this project's
README for the specific indexes this requires if you're querying the same
`hebrew_greek.db` schema (one for each join direction — root mode joins
strongs→verses, exact mode joins
text→verses).

**Never changes at runtime** for a given `:strongsCode`/`mode`/`text`.

## `GET /languages`

No params.

**Response 200:**

```ts
{
  languages: {
    code: string;   // e.g. "eng", "spa" — pass as `lang` to /word/:wordId
    name: string;   // display name, e.g. "English", "Español"
  }[];
}
```

Should reflect whatever `lang` values `/word/:wordId?lang=<code>` will
actually recognize — this is how the client populates its language picker,
it doesn't hardcode a list. **Can change without a redeploy** if your
backend supports adding a new language's data live (the bundled
implementation scans its data directory on every request) — a short cache
lifetime (the bundled implementation uses 1 hour) is more appropriate here
than the "cache indefinitely" guidance for the other three endpoints.

---

## Not part of this contract

`GET /health` exists on the bundled implementation for your own
healthchecks/load balancer probes — the web-app client never calls it, so
your backend doesn't need to expose anything equivalent unless you want it
for your own ops purposes.
