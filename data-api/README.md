# gbt-data-api

Standalone HTTP data API for the [Study App web port](../web-app). Reads the
same pre-built SQLite files the Flutter app ships as assets and exposes them
over a small number of composite REST endpoints. Meant to run as a
long-lived process (e.g. in Docker on a VPS like Hetzner) — this is the
piece that doesn't fit onto Netlify's serverless functions, since it needs a
native module (`better-sqlite3`) and tens of MB of local `.db` files.

**Status:** this project's actual data-serving role in production has been
taken over by a separate service (not in this repo). This code is kept as
the reference implementation and the origin of
[`API_CONTRACT.md`](./API_CONTRACT.md) — the `.db` files themselves are no
longer committed here (see "Data files" below), so a fresh clone needs its
own copies to actually run this locally.

## Why a separate service

The web-app is deployed to Netlify, which runs serverless functions with a
read-only filesystem and (by default) a ~50MB zipped package limit per
function — too tight for a native compiled module plus the `.db` files.
Splitting the data layer out into its own always-on service sidesteps all of
that: `better-sqlite3` just works like it would locally, and the `.db` files
never need to be bundled into a Netlify function.

It also means you're not limited to Netlify's constraints when adding more
data: additional gloss languages, `audio_timings.db`, or new Bible
translations just get added to `data/` here — no Netlify function size
budget to fight.

## Endpoints

- `GET /chapter/:book/:chapter` → `{ hebrewGreekWords, translationLines }`
- `GET /word/:wordId?lang=<code>` → word text, Strong's code/root, grammar
  (raw + expanded), gloss in the requested language (`lang` defaults to
  `eng`; `null` if that word has no gloss recorded, or if `<lang>.db`
  doesn't exist in `data/`), lexicon meanings (English only — SDBH/SDBG
  aren't per-language)
- `GET /similar/:strongsCode?mode=root|exact&text=<word>` → up to 200
  deduplicated verses (root/lemma word, each verse's full word list with
  the match flagged) matching either the same Strong's code (`root`) or
  the exact surface text (`exact`), plus the true total count
- `GET /languages` → `{ languages: [{ code, name }] }` for every `<lang>.db`
  found in `data/` (see `src/language-names.js` for the code→name map;
  unlisted codes fall back to showing the raw code)
- `GET /health` → `{ ok: true }` (no auth required, used for
  healthchecks/load balancer probes)

See **[API_CONTRACT.md](./API_CONTRACT.md)** for the exact request/response
shapes, status codes, and what's required vs. optional — enough to
implement these endpoints against a different backend (e.g. another
service you already run on Hetzner) instead of this one, with no changes
needed on the web-app side.

All responses set `Cache-Control` headers, since none of this data changes
at runtime — safe to cache aggressively at any CDN/proxy in front of this
service, or by the caller itself.

If `DATA_API_KEY` is set, every request other than `/health` must include a
matching `x-api-key` header. Leave it unset only if this service is not
reachable from the public internet (e.g. it's on a private network/firewalled
to just the Netlify function's IP range).

## Developing

```sh
pnpm install
pnpm dev          # node --watch src/server.js, listens on :3000
```

Point the web-app at it locally by leaving `DATA_API_URL` unset (it
defaults to `http://localhost:3000`) or setting it explicitly in
`web-app`'s environment.

## Data files

`data/*.db` is gitignored — not committed here. To run this locally you
need your own copies of:

- `hebrew_greek.db`, `eng_bsb.db`, `sdbh.db`, `sdbg.db` — originate from the
  [Global Bible Tools Study App](https://github.com/globalbibletools/study-app)
  (Flutter)'s bundled assets, specifically:
  - `hebrew_greek.db`'s source (`hbo+grc/`) **is** in
    [globalbibletools/data](https://github.com/globalbibletools/data).
  - `eng_bsb.db` (Berean Standard Bible, public domain) and
    `sdbh.db`/`sdbg.db` (UBS Dictionary of Biblical Hebrew/Greek, CC BY-SA
    4.0) are **not** in that data repo — they're bundled directly as
    USFM/JSON source inside `study-app/database_builder/lib/src/{bible,lexicon}/data/`.
- Gloss languages — `eng.db`, `spa.db`, `fra.db`, `por.db`, `are.db`, and
  ~32 more at varying levels of completeness — **are** built from
  [globalbibletools/data](https://github.com/globalbibletools/data) (one
  JSON file per book per language). Any `<lang>.db` dropped into this
  folder is picked up automatically by `GET /languages` and
  `GET /word/:wordId?lang=<code>`, no code changes needed.

Not built at all yet: `audio_timings.db`.

### Adding more languages

The build tooling that turns a clone of `globalbibletools/data` into
`<lang>.db` files (and can rebuild `hebrew_greek.db` from source) is a
small, dependency-free Python script kept alongside this project during
development but deliberately not committed here (it's a one-off build tool,
not a runtime dependency of the service). If you don't have it, it reads
`hbo+grc/` for the interlinear source and one JSON file per book per
language for glosses; the schema is documented in
[`API_CONTRACT.md`](./API_CONTRACT.md) and in `src/db/*.js`, which is
enough to reimplement it in any language if needed.

`scripts/optimize-hebrew-greek-db.js` adds three indexes (`verses.strongs`,
`strongs.code`, `verses.text`) that the upstream schema doesn't ship
with — without them, `/similar/:strongsCode` does a full table scan of the
448k-row `verses` table on every request (~70ms flat, regardless of how
common the word is) for whichever mode (`root` or `exact`) needs the join
direction that isn't indexed. It's idempotent (`CREATE INDEX IF NOT EXISTS`);
run it again after replacing `data/hebrew_greek.db` with a freshly built copy:

```sh
pnpm optimize-db
```

## Deploying (Docker / Hetzner)

Not the current production path (see "Status" at the top), but still works
if you want to self-host this instead: populate `data/` with your own
`.db` files first (see "Data files" above), then:

```sh
docker compose up -d --build
```

This builds the image (installing `better-sqlite3` fresh inside the
container, so it's compiled for the container's actual platform/arch — don't
copy a host-built `node_modules` in), bakes `data/*.db` into the image, and
runs it on port 3000. Set `DATA_API_KEY` in a `.env` file next to
`docker-compose.yml` (or in your shell) before starting it if you want the
shared-secret check enabled.

Put a reverse proxy in front for TLS — e.g. [Caddy](https://caddyserver.com/)
with a one-line Caddyfile (`data-api.yourdomain.com { reverse_proxy
localhost:3000 }`) is the easiest way to get automatic HTTPS.

Then on the web-app (Netlify) side, set:

- `DATA_API_URL` = `https://data-api.yourdomain.com`
- `DATA_API_KEY` = same value, if you enabled it here

## Licensing

Source code is [CC0 1.0 Universal](../LICENSE) (public domain). The
lexicon data this service serves (`sdbh.db`/`sdbg.db`, the UBS Dictionary
of Biblical Hebrew/Greek) is separately licensed
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
