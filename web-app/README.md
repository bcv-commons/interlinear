# Study App — Web

A web look-alike of the [Global Bible Tools Study App](https://github.com/globalbibletools/study-app) (Flutter),
built with SvelteKit + TypeScript + Tailwind CSS + pnpm.

This is the frontend, deployed to Netlify. It has no database of its own —
all Bible/lexicon/gloss data comes from [`../data-api`](../data-api), a
standalone HTTP service meant to run on a persistent host (e.g. Docker on
Hetzner). See that project's README for why the data layer lives there
instead of in a Netlify function.

## Developing

You need `../data-api` running too (it defaults to `http://localhost:3000`,
so no env var is needed for local dev if you start both):

```sh
# terminal 1
cd ../data-api && pnpm install && pnpm dev

# terminal 2
pnpm install
pnpm dev
```

Then open `http://localhost:5173` (redirects to Genesis 1).

## Environment variables

- `DATA_API_URL` — base URL of the data-api service. Defaults to
  `http://localhost:3000` for local dev. Include a path prefix if the
  backend mounts the contract under one — e.g. production currently points
  at `https://shoresh.up.qombi.com/interlinear` (a separate service that
  implements `data-api/API_CONTRACT.md`, not `../data-api` itself).
- `DATA_API_KEY` — optional shared secret, sent as `x-api-key` on every
  request. Only needed if the backend requires it.

`DATA_API_URL` doesn't have to point at [`../data-api`](../data-api) — any
backend that implements
[`../data-api/API_CONTRACT.md`](../data-api/API_CONTRACT.md) works as a
drop-in replacement. One real backend currently deviates from the contract
in one way: its `/chapter/:book/:chapter` route takes a 3-letter USFM code
(e.g. `GEN`) rather than the numeric book id the contract specifies —
`src/lib/server/dataApi.ts`'s `getChapterData` translates for this via
`bible-books.ts`'s `getUsfmCode()`. If you point this app at a backend that
follows the contract literally (numeric id), that translation would need
to be removed.

## What's included

- Word-by-word Hebrew/Greek interlinear reader alongside the English
  translation (Berean Standard Bible), with headings, poetry indenting, and
  footnote stripping ported from the USFM formatting codes.
- Book/chapter navigation (dropdowns + prev/next), RTL for Hebrew (OT) and
  LTR for Greek (NT), rendered in the SBL BLit font.
- Synced scrolling between the two panels — proportional (not pixel- or
  verse-locked) and instant, ported from the Flutter app's
  `ScrollSyncController` approach (see `src/lib/scrollSync.ts` for the
  reasoning). Works with mouse wheel, touch drag, keyboard, and scrollbar
  drag alike, and on both the desktop side-by-side and mobile stacked
  layouts. Scoped per-chapter for now — see the module doc comment for how
  this is meant to extend once cross-chapter infinite scroll is added.
- Three levels of word info, ported from the Flutter app's tap/long-press/
  tap-the-grammar-code model (`WordHint.svelte` → `WordPopover.svelte`'s
  main view → its inline grammar expansion): a lightweight floating
  gloss-only hint on click, promoting to the full popover (word, raw
  grammar code, gloss, full lexicon entries, copy-word, similar-verses) on
  a second click, with the grammar's human-readable expansion revealed
  inline on a third click — no nested dialogs. Deliberately doesn't show a
  raw Strong's code anywhere, matching the original app; see the root
  word's real home under "similar verses" below.
- "Show similar verses", with the same two search modes as the original
  app — "Root" (every word sharing this Strong's code) and "Exact" (exact
  surface-text match, ignoring punctuation) — and each result verse renders
  its actual text with the matching word highlighted inline, not just a
  bare reference link.
- Gloss language switcher (Settings menu) — data-api currently ships with
  5 languages built (English/Spanish/French/Portuguese/Arabic); any of the
  ~37 languages available upstream can be added to data-api with no
  web-app changes at all, since the language list is fetched at runtime
  (`GET /languages`). See data-api's README for how new languages get built.
- Settings: light/dark/system theme, independent font-size sliders for the
  Hebrew/Greek and translation panels, and gloss language — all persisted
  to `localStorage`.
- All chapter/word/lexicon responses are cached aggressively
  (`Cache-Control: public, immutable`) since none of this reference data
  changes at runtime.

## Not yet ported

These exist in the Flutter app but were out of scope for this first pass:

- Original-language search (on-screen Hebrew/Greek keyboard, prefix/exact
  verse search) — the underlying queries existed in `hebrew_greek.db`'s
  schema (see git history); only the UI/route is missing.
- Scripture audio playback with verse-timing sync (`audio_timings.db` isn't
  wired up in data-api yet — see that project's README).
- Translated Bible text in other languages (only the English Berean
  Standard Bible is wired up — gloss languages are separate and do work,
  see above) and app UI localization (the interface chrome itself is
  English-only).
- Offline/downloadable language packs (not needed for a server-backed app).
- Reading-session tracking (daily goals/streaks).
- Backup/restore and onboarding app-guide tour.

## Architecture

- `src/lib/server/dataApi.ts` — thin `fetch()`-based client for data-api's
  three endpoints (`/chapter`, `/word`, `/similar`). This is the only place
  that knows about `DATA_API_URL`.
- `src/routes/read/[book]/[chapter]/+page.server.ts` and
  `src/routes/api/*/+server.ts` — call the client above and set
  `Cache-Control` headers on the responses the browser/CDN actually sees.
- `src/lib/reference.ts` — word/verse id _unpacking_ (`BBCCCVVVWW` for
  Hebrew/Greek words, `BCCCVVV` for translation), used client-side to group
  words/lines by verse for display. The corresponding packing logic (SQL
  query bounds) now lives in data-api.
- `src/lib/bible-books.ts` — book names/chapter counts, used for the
  book/chapter picker and `+page.server.ts`'s 404/prev-next logic. No DB
  access needed for this.

## Deploying to Netlify

```sh
pnpm build   # uses @sveltejs/adapter-netlify; verify locally before pushing
```

Set the base directory to `web-app` in the Netlify site settings (this repo
also contains `data-api`, a separate project — see the root README), and
set `DATA_API_URL` (and `DATA_API_KEY` if applicable) as environment
variables in the Netlify dashboard.

## Licensing

Source code is [CC0 1.0 Universal](../LICENSE) (public domain), matching
the upstream Flutter app. Two bundled assets carry their own, separate
licenses:

- `static/fonts/sbl_blit.ttf` — SBL Hebrew/Greek font, non-commercial use
  only (see the EULA alongside it).
- The lexicon data served via data-api (UBS Dictionary of Biblical
  Hebrew/Greek) is [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
