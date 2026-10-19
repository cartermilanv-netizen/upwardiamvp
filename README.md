# Upwardia household assessment

A resident-facing household needs assessment. It walks through seven sections, then shows matches, today’s actions, and four progress counts. Answers stay on this device. Nothing is uploaded.

There is no county dashboard, reward ledger, document upload, or seeded program catalog. Until a verified catalog is supplied, the match list stays empty and says so.

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
```

`npm test` runs the matcher and action tests in Node. Those tests do not use a browser or the network.

## Storage

Choose “Save on this device” to keep one browser key, `upwardia.householdAssessment.v1`. Choose “Keep on screen only until I leave” to keep the draft in memory. “Delete everything on this device” removes the key and the memory copy.

This on-device storage is a prototype. It is not a production place to keep resident data.
