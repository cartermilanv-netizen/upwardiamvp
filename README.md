# Upwardia

A public homepage, resource browsing, and a resident household assessment. The assessment walks through seven sections, then shows matches, today’s actions, and four progress counts. Answers stay on this device. Nothing is uploaded.

Category browsing, matching, and Ask Upwardia read `residentCatalog`. That catalog currently shows two published programs whose fields were checked against the official pages. Other records in `lib/resource-database/` stay unpublished and are not shown.

Upwardia Impact is a separate signed-in analytics route at `/impact`. It is not in the resident header, footer, or mobile bar. Demo and Live are separate totals and are never added together. Demo rows are fictional. The Live view in this environment shows one synthetic test action, labeled as not real residents. The resident assessment is still not uploaded, and resident pages do not send analytics events.

## Routes

- `/` homepage
- `/resources` category browsing
- `/assessment` household assessment
- `/plan` personalized results after an assessment is saved on this device
- `/applications` demonstration application center (made-up programs, in-memory drafts)
- `/profile` demonstration profile for those drafts, including the optional aggregate-analytics choice. It is off unless the resident turns it on. Explore Resources and the assessment do not depend on that choice.
- `/ask` Ask Upwardia. Questions go to `POST /api/chat` and the OpenAI Responses API. The assistant may cite only published catalog facts. The key is `OPENAI_API_KEY` on the server. Assessment answers, profile fields, and application drafts are not sent. Upwardia prepares an application and does not submit one.
- `/impact` Upwardia Impact, a separate signed-in demonstration dashboard. It is not linked from the resident navigation.

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

## Upwardia Impact

`/impact` is the partner dashboard. Sign in at `/impact/login`. Demonstration accounts:

| Role | Email | Password |
| --- | --- | --- |
| Upwardia Super Admin | super@impact.demo | demo-super-admin |
| Harbor Jurisdiction Partner | harbor.partner@impact.demo | demo-government |
| Harborlight Organization Admin | harborlight@impact.demo | demo-organization |

These passwords are for the local demonstration. They are not production secrets. Every Impact screen says the figures are demonstration data.

The first server start creates `data/impact.sqlite` and fills it with fictional demo rows plus one synthetic live action sent through the ingest path. That file is gitignored. After sign-in, choose Demo or Live. Those totals are not combined. `GET /api/impact/metrics` and `GET /api/impact/export` require the session cookie. `POST /api/impact/events` is the resident ingest endpoint. It is not called from resident pages. A role only receives its own organization and jurisdiction, and counts under 11 are suppressed.

Optional analytics consent is on My profile. The default is off. Withdraw stops new events. Delete removes that resident's stored analytics events. The id is pseudonymous. Income, health conditions, immigration information, Social Security numbers, chat text, and application answers are not accepted.

## Storage

Choose “Save on this device” to keep one browser key, `upwardia.householdAssessment.v1`. Choose “Keep on screen only until I leave” to keep the draft in memory. “Delete everything on this device” removes the key and the memory copy.

This on-device storage is a prototype. It is not a production place to keep resident data.

## Source check

`lib/resource-database/monitor/` compares one official page with a stored snapshot. The only target is the page named in `lib/resource-database/monitor/proof/target.json`. The check reads `robots.txt` for that host, then fetches the page if the path is allowed. It does not follow links, and it does not change the unpublished catalog.

`npm test` does not use the network. To repeat the one fetch:

```bash
npm run monitor:once
```

The prior snapshot, the observation, and the before-and-after record are written under `lib/resource-database/monitor/proof/`. A text change stays pending human approval. A failed fetch is recorded as a failure.
