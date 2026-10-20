# Upwardia

A public homepage, resource browsing, and a resident household assessment. The assessment walks through seven sections, then shows matches, today’s actions, and four progress counts. Answers stay on this device. Nothing is uploaded.

There is no county dashboard, reward ledger, or document upload. Category browsing, matching, and Ask Upwardia still read `residentCatalog`, which is empty. An unpublished resource-database seed in `lib/resource-database/` holds four official programs pending human review. Those records are not facts, and this app does not show them.

## Routes

- `/` homepage
- `/resources` category browsing
- `/assessment` household assessment
- `/plan` personalized results after an assessment is saved on this device
- `/applications` demonstration application center (made-up programs, in-memory drafts)
- `/profile` demonstration profile for those drafts
- `/ask` Ask Upwardia. Questions go to `POST /api/chat` and the OpenAI Responses API. The assistant may cite only the verified catalog, which is empty until real listings are added. The key is `OPENAI_API_KEY` on the server. Assessment answers, profile fields, and application drafts are not sent.

Privacy, accessibility, and contact links in the footer are placeholders. Each page is labeled “Not finished.”

## Logo

`public/brand/upwardia-mark.png` and `public/brand/upwardia-wordmark.png` are the Upwardia wordmark extracted from the pitch deck, with the black slide background removed. They are the real mark, not a drawn placeholder.

To use a newer official file, replace those two PNGs and keep the same names. The header uses the mark beside the name “Upwardia.” The homepage hero uses the full wordmark.

## Run locally

```bash
npm install
npm run dev -- --port 43123 --hostname 0.0.0.0
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` runs in Node. Those tests do not use a browser or the network.

## Storage

Choose “Save on this device” to keep one browser key, `upwardia.householdAssessment.v1`. Choose “Keep on screen only until I leave” to keep the draft in memory. “Delete everything on this device” removes the key and the memory copy.

This on-device storage is a prototype. It is not a production place to keep resident data.
