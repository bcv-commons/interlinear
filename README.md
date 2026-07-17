# Study App — Web

A web look-alike of the [Global Bible Tools Study App](https://github.com/globalbibletools/study-app)
(Flutter): a word-by-word Hebrew/Greek interlinear Bible reader with synced
scrolling, tap-a-word lexicon/gloss lookups, and multi-language gloss support.

This repo has two projects:

- **[`web-app/`](./web-app)** — SvelteKit frontend, deployed to Netlify.
  Has no database of its own; everything comes from a data API over HTTP
  (`DATA_API_URL`).
- **[`data-api/`](./data-api)** — a small Express service holding the
  actual SQLite data (`better-sqlite3`) and native module, meant to run as
  a long-lived process (Docker on a VPS, e.g. Hetzner) — the piece that
  doesn't fit onto Netlify's serverless functions. **In production this
  role is currently served by a separate project, not this one** — see
  `data-api/README.md`'s "Status" note. This project is kept as the
  reference implementation and the origin of
  [`data-api/API_CONTRACT.md`](./data-api/API_CONTRACT.md), the exact HTTP
  contract `web-app` expects from whatever it's pointed at.

Start with each project's own README for setup/development instructions.

## Origin

Ported from the Flutter app at
[globalbibletools/study-app](https://github.com/globalbibletools/study-app);
the data itself traces back to that app's bundled assets and to
[globalbibletools/data](https://github.com/globalbibletools/data) (the
Hebrew/Greek interlinear source and per-language gloss data — though not
all of it: see `data-api/README.md`'s "Data files" section for which
pieces come from elsewhere).

## Licensing

Source code is [CC0 1.0 Universal](./LICENSE) (public domain), matching the
upstream Flutter app. The bundled fonts and lexicon data carry their own,
separate licenses — see [`web-app/README.md`](./web-app/README.md#licensing).
